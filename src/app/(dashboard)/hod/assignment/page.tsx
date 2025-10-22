/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Select, { MultiValue } from "react-select";
import { Button } from "@/components/ui-controls";
import toast from "react-hot-toast";

type StaffRow = { id: string; user: { id: string; name?: string | null; email?: string | null }; department?: { id: string; name?: string | null; abbreviation?: string | null } };
type Subject = { id: string; name: string; subjectCode: string; targetYear: string };
type Option = { value: string; label: string };

export default function AssignmentPage(): React.ReactElement {
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string[]>>({});
  const [currentSemester, setCurrentSemester] = useState<string>("Loading...");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      // Fetch semester settings
      const semesterRes = await fetch("/api/admin/semester-settings");
      if (semesterRes.ok) {
        const semesterData = await semesterRes.json();
        setCurrentSemester(semesterData.semesterString || "Semester 2025-26");
      }

      // Fetch subjects
      const subjectsRes = await fetch("/api/subjects");
      if (!subjectsRes.ok) throw new Error("Failed to fetch subjects");
      const subjectsData = await subjectsRes.json();
      setSubjects(subjectsData || []);

      // Fetch all staff
      const staffRes = await fetch("/api/staff");
      if (!staffRes.ok) throw new Error("Failed to fetch staff");
      const staffData = await staffRes.json();
      setStaff(staffData || []);

      // Fetch existing assignments
      const assignmentsRes = await fetch("/api/hod/faculty-assignments");
      if (!assignmentsRes.ok) throw new Error("Failed to fetch assignments");
      const assignmentsData = await assignmentsRes.json();

      // Convert assignments array to subject -> staffIds mapping
      const assignmentMap: Record<string, string[]> = {};
      (subjectsData || []).forEach((subject: Subject) => {
        assignmentMap[subject.id] = [];
      });

      (assignmentsData || []).forEach((assignment: any) => {
        if (!assignmentMap[assignment.subjectId]) {
          assignmentMap[assignment.subjectId] = [];
        }
        assignmentMap[assignment.subjectId].push(assignment.staffId);
      });

      setAssignments(assignmentMap);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load data");
    }
  }

  const staffOptions = useMemo((): Option[] => {
    return staff.map((s) => {
      const name = s.user?.name || s.user?.email || "Unnamed";
      const deptAbbr = s.department?.abbreviation ? ` (${s.department.abbreviation})` : "";
      return { value: s.id, label: `${name}${deptAbbr}` };
    });
  }, [staff]);

  const valueForSubject = useCallback((subjectId: string): Option[] => {
    const staffIds = assignments[subjectId] || [];
    return staffOptions.filter((o) => staffIds.includes(o.value));
  }, [assignments, staffOptions]);

  const handleChange = useCallback((subjectId: string, opts: MultiValue<Option> | null) => {
    const picked = opts ? Array.from(opts) as Option[] : [];
    const ids = picked.map((o) => o.value);
    setAssignments((prev) => ({ ...prev, [subjectId]: ids }));
  }, []);

  const handleSaveAll = useCallback(async () => {
    setIsSaving(true);
    try {
      const payload = {
        semester: currentSemester,
        assignments: Object.entries(assignments).flatMap(([subjectId, staffIds]) =>
          staffIds.map(staffId => ({ subjectId, staffId }))
        )
      };

      const res = await fetch(`/api/hod/faculty-assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error?.error || "Failed to save assignments");
      }

      toast.success("All assignments saved successfully!");
    } catch (err) {
      console.error(err);
      toast.error((err as Error).message || "Save failed");
    } finally {
      setIsSaving(false);
    }
  }, [assignments, currentSemester]);

  const selectStyles = useMemo(() => ({
    menuPortal: (base: any) => ({ ...base, zIndex: 9999 }),
    control: (base: any) => ({
      ...base,
      background: 'var(--input-bg)',
      borderColor: 'var(--input-border)',
      '&:hover': {
        borderColor: 'var(--input-focus-border)',
      },
    }),
    menu: (base: any) => ({
      ...base,
      background: 'var(--card-bg)',
      border: '1px solid var(--card-border)',
    }),
    option: (base: any, state: any) => ({
      ...base,
      background: state.isSelected ? 'var(--primary)' : state.isFocused ? 'var(--hover-overlay)' : 'transparent',
      color: state.isSelected ? 'white' : 'var(--text-primary)',
      '&:active': {
        background: 'var(--primary)',
      },
    }),
    multiValue: (base: any) => ({
      ...base,
      background: 'var(--primary-light)',
    }),
    multiValueLabel: (base: any) => ({
      ...base,
      color: 'var(--text-primary)',
    }),
    multiValueRemove: (base: any) => ({
      ...base,
      color: 'var(--text-secondary)',
      '&:hover': {
        background: 'var(--danger-light)',
        color: 'var(--danger)',
      },
    }),
  }), []);

  return (
    <main className="max-w-7xl mx-auto px-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
            Faculty Assignment for {currentSemester}
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Assign faculty members to subjects. Multiple faculty can be assigned to each subject.
          </p>
        </div>
        <Button onClick={handleSaveAll} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save All Assignments"}
        </Button>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: "35%" }}>Subject</th>
              <th>Assigned Faculty</th>
            </tr>
          </thead>
          <tbody>
            {subjects.length === 0 ? (
              <tr>
                <td colSpan={2} className="text-center py-8" style={{ color: "var(--text-muted)" }}>
                  No subjects found. Please add subjects first.
                </td>
              </tr>
            ) : (
              subjects.map((subject) => (
                <tr key={subject.id}>
                  <td>
                    <div>
                      <div className="font-medium" style={{ color: "var(--text-primary)" }}>
                        {subject.name}
                      </div>
                      <div className="text-sm" style={{ color: "var(--text-muted)" }}>
                        {subject.subjectCode}
                      </div>
                    </div>
                  </td>
                  <td>
                    <Select
                      isMulti
                      options={staffOptions}
                      value={valueForSubject(subject.id)}
                      onChange={(opts) => handleChange(subject.id, opts)}
                      menuPortalTarget={typeof document !== "undefined" ? document.body : null}
                      styles={selectStyles}
                      placeholder="Select faculty members..."
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
