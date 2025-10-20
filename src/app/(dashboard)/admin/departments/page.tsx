"use client";

import React, { useEffect, useState } from "react";
import ConfirmationModal from "@/components/confirmation-modal";
import { Edit2, Trash2, Building2, Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { SkeletonTable, SkeletonPulse } from "@/components/skeletons";

type Department = {
  id: string;
  name: string;
  abbreviation: string;
};

export default function ManageDepartmentsPage(): React.ReactElement {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [departmentName, setDepartmentName] = useState("");
  const [departmentAbbreviation, setDepartmentAbbreviation] = useState("");
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [departmentToDelete, setDepartmentToDelete] = useState<Department | null>(null);

  useEffect(() => {
    fetchDepartments();
  }, []);

  async function fetchDepartments() {
    setLoading(true);
    try {
      const res = await fetch("/api/departments");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setDepartments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!departmentName || !departmentAbbreviation) return;

    setIsSubmitting(true);
    try {
      if (editingDepartment) {
        // Update existing department
        const res = await fetch(`/api/departments/${editingDepartment.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: departmentName, abbreviation: departmentAbbreviation }),
        });
        if (!res.ok) throw new Error("Update failed");
        const updated = await res.json();
        setDepartments((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
        setEditingDepartment(null);
      } else {
        // Create new department
        const res = await fetch("/api/departments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: departmentName, abbreviation: departmentAbbreviation }),
        });
        if (!res.ok) throw new Error("Create failed");
        const created = await res.json();
        setDepartments((prev) => [created, ...prev]);
      }

      setIsModalOpen(false);
      setDepartmentName("");
      setDepartmentAbbreviation("");
    } catch (err) {
      console.error(err);
      alert((err as Error).message || "Save failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id?: string) {
    if (!id) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/departments/${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Delete failed");
      setDepartments((prev) => prev.filter((d) => d.id !== id));
      setShowDeleteModal(false);
      setDepartmentToDelete(null);
    } catch (err) {
      console.error(err);
      // consider toasting error
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader 
        title="Manage Departments" 
        description="Add, edit, and manage academic departments"
        action={
          <button
            onClick={() => {
              setEditingDepartment(null);
              setDepartmentName("");
              setDepartmentAbbreviation("");
              setIsModalOpen(true);
            }}
            className="btn-primary gap-2"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Add Department</span>
            <span className="sm:hidden">Add</span>
          </button>
        }
      />

      {loading ? (
        <div className="table-wrapper">
          <SkeletonTable rows={5} columns={3} />
        </div>
      ) : departments.length === 0 ? (
        <EmptyState
          icon={<Building2 size={48} />}
          title="No departments yet"
          description="Get started by adding your first department"
          action={
            <button
              onClick={() => {
                setEditingDepartment(null);
                setDepartmentName("");
                setDepartmentAbbreviation("");
                setIsModalOpen(true);
              }}
              className="btn-primary"
            >
              <Plus size={18} />
              Add Department
            </button>
          }
        />
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Department Name</th>
                <th>Abbreviation</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((d) => (
                <tr key={d.id}>
                  <td className="font-medium">{d.name}</td>
                  <td>{d.abbreviation}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingDepartment(d);
                          setDepartmentName(d.name);
                          setDepartmentAbbreviation(d.abbreviation);
                          setIsModalOpen(true);
                        }}
                        className="p-2 rounded-lg transition-colors hover:bg-[var(--hover-overlay)]"
                        style={{ color: "var(--text-secondary)" }}
                        aria-label="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => {
                          setDepartmentToDelete(d);
                          setShowDeleteModal(true);
                        }}
                        type="button"
                        className="p-2 rounded-lg transition-colors"
                        style={{ color: "var(--danger)" }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "var(--danger-light)"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                        aria-label="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div role="dialog" aria-modal="true" className="modal-content w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                  {editingDepartment ? "Edit Department" : "Add New Department"}
                </h3>
                <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                  Enter department details below.
                </p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="p-2 rounded-lg transition-colors hover:bg-[var(--hover-overlay)]" 
                style={{ color: "var(--text-secondary)" }}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="form-label">Department Name</label>
                <input 
                  value={departmentName} 
                  onChange={(e) => setDepartmentName(e.target.value)} 
                  className="input-field" 
                  required
                />
              </div>

              <div>
                <label className="form-label">Abbreviation</label>
                <input 
                  value={departmentAbbreviation} 
                  onChange={(e) => setDepartmentAbbreviation(e.target.value)} 
                  className="input-field"
                  required 
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-outline">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="btn-primary">
                  {isSubmitting ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationModal
        open={showDeleteModal}
        title="Confirm Deletion"
        description={`Are you sure you want to delete the department "${departmentToDelete?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        loading={isSubmitting}
        onCancel={() => {
          setShowDeleteModal(false);
          setDepartmentToDelete(null);
        }}
        onConfirm={() => handleDelete(departmentToDelete?.id)}
      />
    </div>
  );
}
