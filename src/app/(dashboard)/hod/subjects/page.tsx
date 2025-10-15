"use client";

import React, { useEffect, useState } from "react";
import { Edit, Trash } from "lucide-react";

type Subject = { id: string; name: string; subjectCode: string; academicYear?: { id: string; name: string; abbreviation?: string } };

export default function ManageSubjectsPage(): React.ReactElement {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [name, setName] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [years, setYears] = useState<Array<{ id: string; name: string; abbreviation?: string }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchSubjects();
    fetchYears();
  }, []);

  async function fetchSubjects() {
    try {
      const res = await fetch("/api/subjects");
      if (!res.ok) throw new Error("Failed to fetch subjects");
      const data = await res.json();
      setSubjects(data);
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchYears() {
    try {
      const res = await fetch("/api/years");
      if (!res.ok) throw new Error("Failed to fetch years");
      const data = await res.json();
      setYears(data || []);
    } catch (err) {
      console.error(err);
      setYears([]);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
  if (!name || !subjectCode || !academicYearId) return;

    setIsSubmitting(true);
    try {
      if (editingSubject) {
        const res = await fetch(`/api/subjects/${editingSubject.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, subjectCode, academicYearId }),
        });
        if (!res.ok) {
          let errMsg = "Failed to update subject";
          try {
            const payload = await res.json();
            errMsg = payload?.error || JSON.stringify(payload);
          } catch (e) {
            try {
              errMsg = await res.text();
            } catch (_) {
              /* ignore */
            }
          }
          throw new Error(errMsg);
        }
        const updated = await res.json();
        setSubjects((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        setEditingSubject(null);
      } else {
        const res = await fetch("/api/subjects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, subjectCode, academicYearId }),
        });
        if (!res.ok) {
          let errMsg = "Failed to create subject";
          try {
            const payload = await res.json();
            errMsg = payload?.error || JSON.stringify(payload);
          } catch (e) {
            try {
              errMsg = await res.text();
            } catch (_) {
              /* ignore */
            }
          }
          throw new Error(errMsg);
        }
        const created = await res.json();
        setSubjects((prev) => [created, ...prev]);
      }

      setIsModalOpen(false);
      setName("");
      setSubjectCode("");
      setAcademicYearId("");
    } catch (err) {
      console.error(err);
      alert((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this subject?")) return;
    try {
      const res = await fetch(`/api/subjects/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setSubjects((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error(err);
      alert((err as Error).message || "Delete failed");
    }
  }

  return (
    <main className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Manage Department Subjects</h1>
        <button onClick={() => setIsModalOpen(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
          + Add New Subject
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-gray-700">Subject Name</th>
              <th className="px-6 py-3 text-left text-gray-700">Subject Code</th>
              <th className="px-6 py-3 text-left text-gray-700">Target Year</th>
              <th className="px-6 py-3 text-left text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {subjects.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-6 py-3">{s.name}</td>
                <td className="px-6 py-3">{s.subjectCode}</td>
                <td className="px-6 py-3">{s.academicYear?.abbreviation ?? s.academicYear?.name ?? "-"}</td>
                <td className="px-6 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingSubject(s);
                        setName(s.name);
                        setSubjectCode(s.subjectCode);
                        setAcademicYearId(s.academicYear?.id ?? "");
                        setIsModalOpen(true);
                      }}
                      className="p-2 rounded hover:bg-gray-100 text-gray-600"
                      aria-label="Edit"
                    >
                      <Edit size={16} />
                    </button>
                    <button onClick={() => handleDelete(s.id)} type="button" className="p-2 rounded hover:bg-gray-100 text-red-600" aria-label="Delete">
                      <Trash size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsModalOpen(false)} aria-hidden />
          <div role="dialog" aria-modal className="relative bg-white rounded-lg shadow-xl w-full max-w-xl mx-4 p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">Create Subject</h3>
                <p className="text-sm text-gray-500 mt-1">Add a new subject for your department.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-700 ml-4">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-1 gap-3">
              <label className="text-sm font-medium text-gray-700">Subject Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 rounded-md border border-gray-300" />

              <label className="text-sm font-medium text-gray-700">Subject Code</label>
              <input value={subjectCode} onChange={(e) => setSubjectCode(e.target.value)} className="w-full px-3 py-2 rounded-md border border-gray-300" />

              <label className="text-sm font-medium text-gray-700">Academic Year</label>
              <select value={academicYearId} onChange={(e) => setAcademicYearId(e.target.value)} className="w-full px-3 py-2 rounded-md border border-gray-300">
                <option value="">Select year</option>
                {years.map((y) => (
                  <option key={y.id} value={y.id}>{y.abbreviation ?? y.name}</option>
                ))}
              </select>

              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-md text-gray-700 border">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">{isSubmitting ? "Creating..." : "Create Subject"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
