/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState } from "react";
import Select, { MultiValue } from "react-select";

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
      // data is [{ id, user, subjectIds }]
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

  function subjectOptions(): Option[] {
    return subjects.map((s) => ({ value: s.id, label: `${s.name} (${s.subjectCode})` }));
  }

  function valueForStaff(staffId: string) {
    const ids = selected[staffId] || [];
    const opts = subjectOptions();
    return opts.filter((o) => ids.includes(o.value));
  }

  async function handleSave(staffId: string) {
    const subjectIds = selected[staffId] || [];
    setIsSaving((prev) => ({ ...prev, [staffId]: true }));
    try {
      console.log("HOD: saving assignments for staffId", staffId, { subjectIds });

      const res = await fetch(`/api/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId, subjectIds, semester: CURRENT_SEMESTER }),
      });

      console.log("HOD: save API response status", res.status);
      const json = await res.json().catch(() => null);
      console.log("HOD: save API response json", json);

      if (!res.ok) {
        throw new Error(json?.error || "Failed to save assignments");
      }

      // success feedback: show a temporary Saved marker
      setSavedAt((prev) => ({ ...prev, [staffId]: Date.now() }));
      setTimeout(() => setSavedAt((prev) => ({ ...prev, [staffId]: null })), 3000);
    } catch (err) {
      console.error(err);
      alert((err as Error).message || "Save failed");
    } finally {
      setIsSaving((prev) => ({ ...prev, [staffId]: false }));
    }
  }

  return (
    <main className="max-w-7xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Assign Faculty for {CURRENT_SEMESTER}</h1>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-gray-700">Faculty Name</th>
              <th className="px-6 py-3 text-left text-gray-700">Assigned Subjects</th>
              <th className="px-6 py-3 text-left text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {staff.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-6 py-3">{s.user?.name ?? s.user?.email ?? "Unnamed"}</td>
                <td className="px-6 py-3">
                  <Select
                    isMulti
                    options={subjectOptions()}
                    value={valueForStaff(s.id)}
                    onChange={(opts: MultiValue<Option> | null) => {
                      const picked = opts ? Array.from(opts) as Option[] : [];
                      const ids = picked.map((o) => o.value);
                      setSelected((prev) => ({ ...prev, [s.id]: ids }));
                    }}
                    // render the menu into document.body so it is not clipped by overflow:hidden parents
                    menuPortalTarget={typeof document !== "undefined" ? document.body : null}
                    styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
                  />
                </td>
                <td className="px-6 py-3">
                  <button
                    onClick={() => handleSave(s.id)}
                    className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2"
                    disabled={!!isSaving[s.id]}
                  >
                    {isSaving[s.id] ? (
                      "Saving..."
                    ) : savedAt[s.id] ? (
                      <span className="text-green-100">Saved!</span>
                    ) : (
                      "Save"
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
