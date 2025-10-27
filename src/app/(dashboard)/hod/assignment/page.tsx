/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
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
  const [rawAssignmentsData, setRawAssignmentsData] = useState<any[]>([]);
  const rowKeyToSubjectIdRef = React.useRef<Record<string, string>>({});
  const [currentSemester, setCurrentSemester] = useState<string>("Loading...");
  const [isSaving, setIsSaving] = useState(false);
  const { data: session } = useSession();

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

  // Save raw assignments for downstream mapping (mapping is done in a useMemo to avoid timing issues)
  setRawAssignmentsData(assignmentsData || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load data");
    }
  }

  // Determine department-scoped assignments (memoized to avoid timing issues)
  const departmentAssignments = useMemo(() => {
    const hodDepartmentIdFromSession = session && (session.user as any) && (session.user as any).departmentId
      ? String((session.user as any).departmentId)
      : undefined;

    const inferredDepartmentId = (rawAssignmentsData && rawAssignmentsData.length > 0 && rawAssignmentsData[0].departmentId)
      ? String(rawAssignmentsData[0].departmentId)
      : undefined;

    const hodDepartmentId = hodDepartmentIdFromSession || inferredDepartmentId;

  // no debug logs in production

    const deps = hodDepartmentId
      ? (rawAssignmentsData || []).filter((a: any) => String(a.departmentId) === hodDepartmentId)
      : (rawAssignmentsData || []);

  // no debug logs in production

    return deps;
  }, [rawAssignmentsData, session]);

  // Build assignments mapping after subjects and departmentAssignments are available
  const assignmentsBySubjectId = useMemo(() => {
    if (!subjects || subjects.length === 0) {
      console.log('⚠️ Subjects not loaded yet, skipping mapping');
      return {} as Record<string, string[]>;
    }

    if (!departmentAssignments || departmentAssignments.length === 0) {
      console.log('⚠️ No assignments to map');
      return {} as Record<string, string[]>;
    }

    const map: Record<string, string[]> = {};

    // Build subject ID lookup (subject._id -> junction id)
    const subjectIdToJunctionId: Record<string, string> = {};
    subjects.forEach((subject) => {
      const subjOid = (subject as any)._id;
      if (subjOid) subjectIdToJunctionId[String(subjOid)] = String((subject as any).id);
    });

  // subject ID mapping built

    (departmentAssignments || []).forEach((assignment: any) => {
      const subjectId = String(assignment.subjectId);

      if (!map[subjectId]) map[subjectId] = [];
      map[subjectId].push(assignment.staffId);

      const junctionId = subjectIdToJunctionId[subjectId];
      if (junctionId && junctionId !== subjectId) {
        if (!map[junctionId]) map[junctionId] = [];
        map[junctionId].push(assignment.staffId);
      }
    });

    // ALSO attempt to map by subjectCode when assignments include it (handles shared subjects across departments)
    const subjectCodeToIds: Record<string, string[]> = {};
    subjects.forEach((subject: any) => {
      const code = subject.subjectCode;
      if (!code) return;
      if (!subjectCodeToIds[code]) subjectCodeToIds[code] = [];
      subjectCodeToIds[code].push(String(subject.id));
    });

    (departmentAssignments || []).forEach((assignment: any) => {
      const code = assignment.subjectCode || assignment.subject?.subjectCode;
      if (!code) return;
      const ids = subjectCodeToIds[code] || [];
      ids.forEach((sid) => {
        if (!map[sid]) map[sid] = [];
        map[sid].push(assignment.staffId);
      });
    });

  // assignment mapping built

    // Debug per subject
    subjects.forEach((subject: any) => {
      const assignmentsFor = map[subject.id] || [];
      if (assignmentsFor.length === 0 && subject.name) {
        // intentionally silent in production
      }
    });

    return map;
  }, [subjects, departmentAssignments]);

  // When subjects or mapping change, populate the row-keyed assignments state
  useEffect(() => {
    const assignmentMap: Record<string, string[]> = {};
    rowKeyToSubjectIdRef.current = {};
    (subjects || []).forEach((subject: Subject & any) => {
      const rowKey = subject._junctionId || `${subject.id}-${subject.academicYearId || (subject.academicYear && subject.academicYear.id) || 'no-ay'}`;
      rowKeyToSubjectIdRef.current[rowKey] = subject.id;
      assignmentMap[rowKey] = assignmentsBySubjectId[subject.id] ? Array.from(new Set(assignmentsBySubjectId[subject.id])) : [];
    });
    setAssignments(assignmentMap);
  }, [subjects, assignmentsBySubjectId]);

  const staffOptions = useMemo((): Option[] => {
    return staff.map((s) => {
      const name = s.user?.name || s.user?.email || "Unnamed";
      const deptAbbr = s.department?.abbreviation ? ` (${s.department.abbreviation})` : "";
      return { value: s.id, label: `${name}${deptAbbr}` };
    });
  }, [staff]);

  const valueForSubject = useCallback((rowKey: string): Option[] => {
    const staffIds = assignments[rowKey] || [];
    return staffOptions.filter((o) => staffIds.includes(o.value));
  }, [assignments, staffOptions]);

  const handleChange = useCallback((rowKey: string, opts: MultiValue<Option> | null) => {
    const picked = opts ? Array.from(opts) as Option[] : [];
    const ids = picked.map((o) => o.value);
    setAssignments((prev) => ({ ...prev, [rowKey]: ids }));
  }, []);

  const handleSaveAll = useCallback(async () => {
    setIsSaving(true);
    try {
      const payload = {
        semester: currentSemester,
        // Convert rowKey back to subjectId for the API payload
        assignments: Object.entries(assignments).flatMap(([rowKey, staffIds]) => {
          const subjectId = rowKeyToSubjectIdRef.current[rowKey] || rowKey.split('-')[0];
          return staffIds.map(staffId => ({ subjectId, staffId }));
        })
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
              subjects.map((subject) => {
                const sAny = subject as any;
                const rowKey = sAny._junctionId || `${subject.id}-${sAny.academicYearId || (sAny.academicYear && sAny.academicYear.id) || 'no-ay'}`;
                return (
                  <tr key={rowKey}>
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
                        value={valueForSubject(rowKey)}
                        onChange={(opts) => handleChange(rowKey, opts)}
                        menuPortalTarget={typeof document !== "undefined" ? document.body : null}
                        styles={selectStyles}
                        placeholder="Select faculty members..."
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
