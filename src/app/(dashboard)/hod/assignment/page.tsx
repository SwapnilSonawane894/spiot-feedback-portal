/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Select, { MultiValue } from "react-select";
import { Button } from "@/components/ui-controls";

type StaffRow = { id: string; user: { id: string; name?: string | null; email?: string | null }; subjectIds?: string[] };
type Subject = { id: string; name: string; subjectCode: string; targetYear: string };
type Option = { value: string; label: string };

const CURRENT_SEMESTER = "Odd 2025-26";

export default function AssignmentPage(): React.ReactElement {
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [isSaving, setIsSaving] = useState<Record<string, boolean>>({});
  const [savedAt, setSavedAt] = useState<Record<string, number | null>>({});

  useEffect(() => {
    fetchAssignments();
    fetchSubjects();
  }, []);

  async function fetchAssignments() {
    try {
      const res = await fetch("/api/assignments");
      if (!res.ok) throw new Error("Failed to fetch assignments");
      const data = (await res.json()) as StaffRow[];
      setStaff(data || []);

      const map: Record<string, string[]> = {};
      (data || []).forEach((s) => {
        map[s.id] = Array.isArray(s.subjectIds) ? s.subjectIds : [];
      });
      setSelected(map);
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchSubjects() {
    try {
      const res = await fetch("/api/subjects");
      if (!res.ok) throw new Error("Failed to fetch subjects");
      const data = await res.json();
      setSubjects(data || []);
    } catch (err) {
      console.error(err);
    }
  }

  const subjectOptions = useMemo((): Option[] => {
    return subjects.map((s) => ({ value: s.id, label: `${s.name} (${s.subjectCode})` }));
  }, [subjects]);

  const valueForStaff = useCallback((staffId: string): Option[] => {
    const ids = selected[staffId] || [];
    return subjectOptions.filter((o) => ids.includes(o.value));
  }, [selected, subjectOptions]);

  const handleChange = useCallback((staffId: string, opts: MultiValue<Option> | null) => {
    const picked = opts ? Array.from(opts) as Option[] : [];
    const ids = picked.map((o) => o.value);
    setSelected((prev) => ({ ...prev, [staffId]: ids }));
  }, []);

  const handleSave = useCallback(async (staffId: string) => {
    const subjectIds = selected[staffId] || [];
    setIsSaving((prev) => ({ ...prev, [staffId]: true }));
    try {
      const res = await fetch(`/api/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId, subjectIds, semester: CURRENT_SEMESTER }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || "Failed to save assignments");
      }

      setSavedAt((prev) => ({ ...prev, [staffId]: Date.now() }));
      setTimeout(() => setSavedAt((prev) => ({ ...prev, [staffId]: null })), 3000);
    } catch (err) {
      console.error(err);
      alert((err as Error).message || "Save failed");
    } finally {
      setIsSaving((prev) => ({ ...prev, [staffId]: false }));
    }
  }, [selected]);

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
    <main className="max-w-7xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6" style={{ color: "var(--text-primary)" }}>
        Assign Faculty for {CURRENT_SEMESTER}
      </h1>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Faculty Name</th>
              <th>Assigned Subjects</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id}>
                <td>{s.user?.name ?? s.user?.email ?? "Unnamed"}</td>
                <td>
                  <Select
                    isMulti
                    options={subjectOptions}
                    value={valueForStaff(s.id)}
                    onChange={(opts) => handleChange(s.id, opts)}
                    menuPortalTarget={typeof document !== "undefined" ? document.body : null}
                    styles={selectStyles}
                  />
                </td>
                <td>
                  <Button
                    onClick={() => handleSave(s.id)}
                    disabled={!!isSaving[s.id]}
                  >
                    {isSaving[s.id] ? (
                      "Saving..."
                    ) : savedAt[s.id] ? (
                      <span style={{ color: "var(--success)" }}>Saved!</span>
                    ) : (
                      "Save"
                    )}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
