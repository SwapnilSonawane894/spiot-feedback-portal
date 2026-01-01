"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Trash2, Pencil, Plus, X } from "lucide-react";
import { Button } from "@/components/ui-controls";
import { SkeletonTable } from "@/components/skeletons";
import { CustomSelect } from "@/components/custom-select";
import toast from "react-hot-toast";

type Department = {
  id: string;
  name: string;
  abbreviation?: string;
};

type AcademicYear = {
  id: string;
  name: string;
  abbreviation?: string;
  departmentId?: string;
};

type Subject = {
  id: string;
  name: string;
  subjectCode: string;
  semester?: number;
  academicYearId?: string;
  academicYear?: AcademicYear;
  departments?: Department[];
};

export default function AdminManageSubjectsPage(): React.ReactElement {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  const [name, setName] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [semester, setSemester] = useState<number>(1);
  const [academicYearId, setAcademicYearId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchSubjects();
    fetchDepartments();
    fetchAcademicYears();
  }, []);

  async function fetchSubjects() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/subjects");
      if (!res.ok) throw new Error("Failed to fetch subjects");
      const data = await res.json();
      setSubjects(data);
    } catch (err) {
      // console.error(err);
      toast.error("Failed to load subjects");
    } finally {
      setLoading(false);
    }
  }

  async function fetchDepartments() {
    try {
      const res = await fetch("/api/departments");
      if (!res.ok) throw new Error("Failed to fetch departments");
      const data = await res.json();
      setDepartments(data);
    } catch (err) {
      // console.error(err);
    }
  }

  async function fetchAcademicYears() {
    try {
      const res = await fetch("/api/years");
      if (!res.ok) throw new Error("Failed to fetch academic years");
      const data = await res.json();
      setAcademicYears(data || []);
    } catch (err) {
      // console.error(err);
      setAcademicYears([]);
    }
  }

  const filteredAcademicYears = departmentId 
    ? academicYears.filter(y => y.departmentId === departmentId)
    : academicYears;

  const handleDelete = useCallback(async (id: string, subjectCode: string) => {
    if (!confirm(`Delete subject "${subjectCode}"? This will remove it from all departments.`)) return;
    try {
      const res = await fetch(`/api/admin/subjects/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error?.error || "Delete failed");
      }
      setSubjects((prev) => prev.filter((s) => s.id !== id));
      toast.success("Subject deleted successfully");
    } catch (err) {
      // console.error(err);
      toast.error((err as Error).message || "Delete failed");
    }
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !subjectCode || !semester || !academicYearId) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (!departmentId) {
      toast.error("Please select a department");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingSubject) {
        const res = await fetch(`/api/admin/subjects/${editingSubject.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            name, 
            subjectCode, 
            semester, 
            academicYearId,
            departmentIds: [departmentId]
          }),
        });
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error?.error || "Failed to update subject");
        }
        await fetchSubjects();
        toast.success("Subject updated successfully");
        setEditingSubject(null);
      } else {
        const res = await fetch("/api/admin/subjects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            name, 
            subjectCode, 
            semester, 
            academicYearId,
            departmentIds: [departmentId]
          }),
        });
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error?.error || "Failed to create subject");
        }
        await fetchSubjects();
        toast.success("Subject created successfully");
      }

      setIsModalOpen(false);
      setName("");
      setSubjectCode("");
      setSemester(1);
      setAcademicYearId("");
      setDepartmentId("");
    } catch (err) {
      // console.error(err);
      toast.error((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  }, [name, subjectCode, semester, academicYearId, departmentId, editingSubject]);

  const openCreateModal = useCallback(() => {
    setEditingSubject(null);
    setName("");
    setSubjectCode("");
    setSemester(1);
    setAcademicYearId("");
    setDepartmentId("");
    setIsModalOpen(true);
  }, []);

  const openEditModal = useCallback((subject: Subject) => {
    setEditingSubject(subject);
    setName(subject.name);
    setSubjectCode(subject.subjectCode);
    setSemester(subject.semester || 1);
    setAcademicYearId(subject.academicYearId || subject.academicYear?.id || "");
    setDepartmentId(subject.departments?.[0]?.id || "");
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingSubject(null);
    setName("");
    setSubjectCode("");
    setSemester(1);
    setAcademicYearId("");
    setDepartmentId("");
  }, []);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
            Subject Management
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Manage subjects across all departments
          </p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus size={16} className="mr-2" />
          Add Subject
        </Button>
      </div>

      {loading ? (
        <div className="table-wrapper">
          <SkeletonTable rows={6} columns={6} />
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Subject Name</th>
                <th>Subject Code</th>
                <th>Semester</th>
                <th>Academic Year</th>
                <th>Departments</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {subjects.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8" style={{ color: "var(--text-muted)" }}>
                    No subjects found
                  </td>
                </tr>
              ) : (
                subjects.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>{s.subjectCode}</td>
                  <td>
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium" 
                      style={{ 
                        background: s.semester && s.semester % 2 === 1 ? "var(--primary-light)" : "var(--success-light)",
                        color: s.semester && s.semester % 2 === 1 ? "var(--primary)" : "var(--success)"
                      }}>
                      Sem {s.semester} ({s.semester && s.semester % 2 === 1 ? "Odd" : "Even"})
                    </span>
                  </td>
                  <td>{s.academicYear?.abbreviation || s.academicYear?.name || "—"}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {s.departments && s.departments.length > 0 ? (
                        s.departments.map(dept => (
                          <span 
                            key={dept.id}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                            style={{
                              background: "var(--secondary-light)",
                              color: "var(--text-secondary)"
                            }}
                          >
                            {dept.abbreviation || dept.name}
                          </span>
                        ))
                      ) : "—"}
                    </div>
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(s)}
                        className="btn-icon"
                        title="Edit"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(s.id, s.subjectCode)}
                        className="btn-icon"
                        title="Delete"
                        style={{ color: "var(--danger)" }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div 
            className="modal-content max-w-2xl w-full mx-4 p-6" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
                  {editingSubject ? "Edit Subject" : "Add Subject"}
                </h2>
                <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                  {editingSubject ? "Update subject information" : "Create a new subject for selected departments"}
                </p>
              </div>
              <button 
                onClick={closeModal} 
                className="p-2 rounded-lg hover:bg-[var(--hover-overlay)] transition-colors"
                style={{ color: "var(--text-secondary)" }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="form-label">
                  Subject Name <span style={{ color: "var(--danger)" }}>*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field"
                  required
                  placeholder="e.g., Entrepreneurship Development And Startups"
                />
              </div>

              <div>
                <label className="form-label">
                  Subject Code <span style={{ color: "var(--danger)" }}>*</span>
                </label>
                <input
                  type="text"
                  value={subjectCode}
                  onChange={(e) => setSubjectCode(e.target.value)}
                  className="input-field"
                  required
                  placeholder="e.g., 315002"
                />
                <p className="form-helper">
                  Same subject code can be used for different departments
                </p>
              </div>

              <CustomSelect
                label={
                  <span>
                    Semester <span style={{ color: "var(--danger)" }}>*</span>
                  </span>
                }
                options={[
                  { value: "1", label: "1st Semester (Odd)" },
                  { value: "2", label: "2nd Semester (Even)" },
                  { value: "3", label: "3rd Semester (Odd)" },
                  { value: "4", label: "4th Semester (Even)" },
                  { value: "5", label: "5th Semester (Odd)" },
                  { value: "6", label: "6th Semester (Even)" },
                ]}
                value={String(semester)}
                onChange={(val) => setSemester(Number(val))}
                placeholder="Select semester"
              />

              <CustomSelect
                label={
                  <span>
                    Department <span style={{ color: "var(--danger)" }}>*</span>
                  </span>
                }
                options={[
                  { value: "", label: "Select department" },
                  ...departments.map((dept) => ({
                    value: dept.id,
                    label: `${dept.name} (${dept.abbreviation || ''})`
                  }))
                ]}
                value={departmentId}
                onChange={(val) => setDepartmentId(String(val))}
                placeholder="Select department"
              />

              <CustomSelect
                label={
                  <span>
                    Academic Year <span style={{ color: "var(--danger)" }}>*</span>
                  </span>
                }
                options={[
                  { value: "", label: departmentId ? "Select academic year for department" : "Select a department first or choose from all years" },
                  ...filteredAcademicYears.map((y) => ({
                    value: y.id,
                    label: y.abbreviation || y.name
                  }))
                ]}
                value={academicYearId}
                onChange={(val) => setAcademicYearId(String(val))}
                placeholder="Select academic year"
              />

              <div className="flex gap-3 justify-end pt-6">
                <button type="button" onClick={closeModal} className="btn-outline">
                  Cancel
                </button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (editingSubject ? "Saving..." : "Creating...") : (editingSubject ? "Save Changes" : "Create Subject")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
