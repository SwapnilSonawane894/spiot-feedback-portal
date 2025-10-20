"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Edit, Trash, Plus } from "lucide-react";
import { Button } from "@/components/ui-controls";
import { CustomSelect } from "@/components/custom-select";
import { SkeletonTable } from "@/components/skeletons";

type Subject = { 
  id: string; 
  name: string; 
  subjectCode: string; 
  academicYear?: { id: string; name: string; abbreviation?: string } 
};

export default function ManageSubjectsPage(): React.ReactElement {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
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
    setLoading(true);
    try {
      const res = await fetch("/api/subjects");
      if (!res.ok) throw new Error("Failed to fetch subjects");
      const data = await res.json();
      setSubjects(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
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

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
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
            } catch (_) {}
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
            } catch (_) {}
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
  }, [editingSubject, name, subjectCode, academicYearId]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Delete this subject?")) return;
    try {
      const res = await fetch(`/api/subjects/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setSubjects((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error(err);
      alert((err as Error).message || "Delete failed");
    }
  }, []);

  const openCreateModal = useCallback(() => {
    setEditingSubject(null);
    setName("");
    setSubjectCode("");
    setAcademicYearId("");
    setIsModalOpen(true);
  }, []);

  const openEditModal = useCallback((s: Subject) => {
    setEditingSubject(s);
    setName(s.name);
    setSubjectCode(s.subjectCode);
    setAcademicYearId(s.academicYear?.id ?? "");
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  return (
    <main className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
          Manage Department Subjects
        </h1>
        <Button onClick={openCreateModal} className="gap-2">
          <Plus size={18} />
          Add New Subject
        </Button>
      </div>

      {loading ? (
        <div className="table-wrapper">
          <SkeletonTable rows={5} columns={4} />
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Subject Name</th>
                <th>Subject Code</th>
                <th>Target Year</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((s) => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td>{s.subjectCode}</td>
                <td>{s.academicYear?.abbreviation ?? s.academicYear?.name ?? "-"}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(s)}
                      className="p-2 rounded-lg transition-colors hover:bg-[var(--hover-overlay)]"
                      style={{ color: "var(--text-secondary)" }}
                      aria-label="Edit"
                    >
                      <Edit size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(s.id)} 
                      type="button" 
                      className="p-2 rounded-lg transition-colors"
                      style={{ color: "var(--danger)" }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "var(--danger-light)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                      aria-label="Delete"
                    >
                      <Trash size={16} />
                    </button>
                  </div>
                </td>
              </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div 
            role="dialog" 
            aria-modal="true" 
            className="modal-content w-full max-w-xl mx-4 p-6" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                  {editingSubject ? "Edit Subject" : "Create Subject"}
                </h3>
                <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                  {editingSubject ? "Update subject details." : "Add a new subject for your department."}
                </p>
              </div>
              <button 
                onClick={closeModal} 
                className="p-2 rounded-lg transition-colors ml-4 hover:bg-[var(--hover-overlay)]"
                style={{ color: "var(--text-secondary)" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="form-label">Subject Name</label>
                <input 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="form-label">Subject Code</label>
                <input 
                  value={subjectCode} 
                  onChange={(e) => setSubjectCode(e.target.value)} 
                  className="input-field"
                  required
                />
              </div>

              <CustomSelect
                label="Academic Year"
                options={[
                  { value: "", label: "Select year" },
                  ...years.map((y) => ({ value: y.id, label: y.abbreviation ?? y.name }))
                ]}
                value={academicYearId}
                onChange={setAcademicYearId}
              />

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={closeModal} className="btn-outline">
                  Cancel
                </button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : (editingSubject ? "Save" : "Create Subject")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
