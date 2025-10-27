"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Edit, Trash, Plus } from "lucide-react";
import { Button } from "@/components/ui-controls";
import { CustomSelect } from "@/components/custom-select";
import { SkeletonTable } from "@/components/skeletons";
import toast from "react-hot-toast";

type Subject = { 
  id: string; 
  name: string; 
  subjectCode: string; 
  semester?: number;
  academicYear?: { id: string; name: string; abbreviation?: string } 
};

export default function ManageSubjectsPage(): React.ReactElement {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [name, setName] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [semester, setSemester] = useState<number>(1);
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
    if (!name || !subjectCode || !academicYearId || !semester) return;

    setIsSubmitting(true);
    try {
      if (editingSubject) {
        const res = await fetch(`/api/subjects/${editingSubject.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, subjectCode, academicYearId, semester }),
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
        toast.success("Subject updated successfully");
      } else {
        const res = await fetch("/api/subjects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, subjectCode, academicYearId, semester }),
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
        const payload = await res.json();
        // Server may return structured payload: { subject, created, attachedToDepartment }
        if (res.status === 201) {
          // The server returns { subject, created: true, attachedToDepartment: true }
          // Ensure we extract the actual subject object when present.
          const created = payload?.subject || payload;
          setSubjects((prev) => [created, ...prev]);
          toast.success("Subject created successfully");
        } else if (res.status === 200) {
          const returned = payload.subject || payload;
          // Add or update returned subject in list
          setSubjects((prev) => [returned, ...prev.filter(s => s.id !== returned.id)]);
          if (payload.attachedToDepartment) {
            toast.success("Subject already exists — linked to your department.");
          } else {
            toast("Subject already exists and is already linked to your department.");
          }
        }
      }

      setIsModalOpen(false);
      setName("");
      setSubjectCode("");
      setSemester(1);
      setAcademicYearId("");
    } catch (err) {
      console.error(err);
      toast.error((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  }, [editingSubject, name, subjectCode, semester, academicYearId]);

  const handleDelete = useCallback(async (id: string) => {
    // user-facing warning clarifying scope of deletion
    const confirmed = confirm(
      "This will remove this subject from YOUR department only. Other departments using this subject will NOT be affected.\n\nDo you want to continue?"
    );
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/subjects/${id}`, { method: "DELETE" });
      if (!res.ok) {
        let errMsg = 'Delete failed';
        try {
          const payload = await res.json();
          errMsg = payload?.error || errMsg;
        } catch (_) {}
        throw new Error(errMsg);
      }

      // remove any subjects in the UI that match either the master id or the removed junction
      setSubjects((prev) => prev.filter((s) => {
        const sAny = s as any;
        const junctionId = sAny._junctionId || null;
        return !(s.id === id || junctionId === id);
      }));
      toast.success("Subject removed from your department");
    } catch (err) {
      console.error(err);
      toast.error((err as Error).message || "Delete failed");
    }
  }, []);

  const openCreateModal = useCallback(() => {
    setEditingSubject(null);
    setName("");
    setSubjectCode("");
    setSemester(1);
    setAcademicYearId("");
    setIsModalOpen(true);
  }, []);

  const openEditModal = useCallback((s: Subject) => {
    setEditingSubject(s);
    setName(s.name);
    setSubjectCode(s.subjectCode);
    setSemester(s.semester || 1);
    setAcademicYearId(s.academicYear?.id ?? "");
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  return (
    <main className="max-w-7xl mx-auto px-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
            Manage Department Subjects
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Add and manage subjects for your department
          </p>
        </div>
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
                <th>Semester</th>
                <th>Target Year</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((s) => {
                const sAny = s as any;
                const rowKey = sAny._junctionId || `${s.id}-${sAny.academicYearId || (sAny.academicYear && sAny.academicYear.id) || 'no-ay'}`;
                return (
                  <tr key={rowKey}>
                    <td>{s.name}</td>
                    <td>{s.subjectCode}</td>
                    <td>
                      {s.semester ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium" 
                          style={{ 
                            background: s.semester % 2 === 1 ? "var(--primary-light)" : "var(--info-light)",
                            color: s.semester % 2 === 1 ? "var(--primary)" : "var(--info)"
                          }}>
                          Sem {s.semester} ({s.semester % 2 === 1 ? "Odd" : "Even"})
                        </span>
                      ) : "-"}
                    </td>
                    <td>{sAny.academicYear?.abbreviation ?? sAny.academicYear?.name ?? "-"}</td>
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
                          onClick={() => {
                            const sAny = s as any;
                            // Prefer passing the junction id when available so server deletes only that junction
                            const targetId = sAny._junctionId || s.id;
                            handleDelete(targetId);
                          }} 
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
                );
              })}
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
                label="Semester"
                options={[
                  { value: "1", label: "1st Semester (Odd)" },
                  { value: "2", label: "2nd Semester (Even)" },
                  { value: "3", label: "3rd Semester (Odd)" },
                  { value: "4", label: "4th Semester (Even)" },
                  { value: "5", label: "5th Semester (Odd)" },
                  { value: "6", label: "6th Semester (Even)" },
                ]}
                value={String(semester)}
                onChange={(value) => setSemester(Number(value))}
              />

              <CustomSelect
                label="Academic Year"
                options={[
                  { value: "", label: "Select year" },
                  ...years.map((y) => ({ value: y.id, label: y.abbreviation ?? y.name }))
                ]}
                value={academicYearId}
                onChange={setAcademicYearId}
              />

              {/* Removed: Link to existing subject checkbox (handled automatically by backend) */}

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
