"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui-controls";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { SkeletonTable } from "@/components/skeletons";
import { CustomSelect } from "@/components/custom-select";
import toast from "react-hot-toast";

type Year = { id: string; name: string; abbreviation: string; departmentId?: string };
type Department = { id: string; name: string; abbreviation: string };

export default function ManageYearsPage(): React.ReactElement {
  const [years, setYears] = useState<Year[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ open: boolean; yearId: string; yearName: string }>({ 
    open: false, 
    yearId: '', 
    yearName: '' 
  });
  const [name, setName] = useState("");
  const [abbrev, setAbbrev] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [editingYear, setEditingYear] = useState<Year | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchYears();
    fetchDepartments();
  }, []);

  async function fetchYears() {
    setLoading(true);
    try {
      const res = await fetch("/api/years");
      const data = await res.json();
      setYears(data || []);
    } catch (err) {
      // console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchDepartments() {
    try {
      const res = await fetch("/api/departments");
      const data = await res.json();
      setDepartments(data || []);
    } catch (err) {
      // console.error(err);
    }
  }

  const handleCreate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/years", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, abbreviation: abbrev, departmentId: departmentId || null }),
      });
      if (!res.ok) throw new Error("Failed to create");
      setName("");
      setAbbrev("");
      setDepartmentId("");
      setShowModal(false);
      fetchYears();
      toast.success("Academic year created successfully");
    } catch (err) {
      // console.error(err);
      toast.error((err as Error).message || "Create failed");
    }
  }, [name, abbrev, departmentId]);

  const handleUpdate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingYear) return;
    
    try {
      const res = await fetch(`/api/years/${editingYear.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, abbreviation: abbrev, departmentId: departmentId || null }),
      });
      if (!res.ok) throw new Error("Failed to update");
      setName("");
      setAbbrev("");
      setDepartmentId("");
      setEditingYear(null);
      setShowModal(false);
      fetchYears();
      toast.success("Academic year updated successfully");
    } catch (err) {
      // console.error(err);
      toast.error((err as Error).message || "Update failed");
    }
  }, [name, abbrev, departmentId, editingYear]);

  const openDeleteConfirm = useCallback((yearId: string, yearName: string) => {
    setDeleteConfirmModal({ open: true, yearId, yearName });
  }, []);

  const closeDeleteConfirm = useCallback(() => {
    setDeleteConfirmModal({ open: false, yearId: '', yearName: '' });
  }, []);

  const handleDelete = useCallback(async () => {
    const { yearId } = deleteConfirmModal;
    if (!yearId) return;
    
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/years/${yearId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      fetchYears();
      toast.success("Academic year deleted successfully");
      closeDeleteConfirm();
    } catch (err) {
      // console.error(err);
      toast.error((err as Error).message || "Delete failed");
    } finally {
      setIsDeleting(false);
    }
  }, [deleteConfirmModal, closeDeleteConfirm]);

  const openCreateModal = useCallback(() => {
    setName("");
    setAbbrev("");
    setDepartmentId("");
    setEditingYear(null);
    setShowModal(true);
  }, []);

  const openEditModal = useCallback((year: Year) => {
    setName(year.name);
    setAbbrev(year.abbreviation);
    setDepartmentId(year.departmentId || "");
    setEditingYear(year);
    setShowModal(true);
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setEditingYear(null);
  }, []);

  return (
    <main className="max-w-4xl mx-auto">
      <div className="flex items-start flex-col gap-3 justify-between mb-6">
        <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
          Manage Academic Years
        </h1>
        <Button onClick={openCreateModal} className="gap-2">
          <Plus size={18} />
          New Year
        </Button>
      </div>

      {loading ? (
        <div className="table-wrapper">
          <SkeletonTable rows={5} columns={3} />
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Abbreviation</th>
                <th>Department</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {years.map((y) => {
                const dept = departments.find(d => d.id === y.departmentId);
                return (
                  <tr key={y.id}>
                    <td>{y.name}</td>
                    <td>{y.abbreviation}</td>
                    <td>{dept ? dept.name : 'All Departments'}</td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditModal(y)}
                          className="btn-icon"
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => openDeleteConfirm(y.id, y.name)}
                          className="btn-icon text-red-600 hover:text-red-700"
                          title="Delete"
                        >
                          <Trash2 size={16} />
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

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div 
            role="dialog" 
            aria-modal="true" 
            className="modal-content w-full max-w-md p-6" 
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
              {editingYear ? "Edit Academic Year" : "Create Academic Year"}
            </h2>
            <form onSubmit={editingYear ? handleUpdate : handleCreate} className="space-y-4">
              <div>
                <label className="form-label">Name</label>
                <input 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  className="input-field" 
                  placeholder="e.g., First Year Computer Engineering"
                  required
                />
              </div>
              <div>
                <label className="form-label">Abbreviation</label>
                <input 
                  value={abbrev} 
                  onChange={(e) => setAbbrev(e.target.value)} 
                  className="input-field"
                  placeholder="e.g., FYCO"
                  required
                />
              </div>
              <div>
                <CustomSelect
                  label="Department (Optional)"
                  options={[
                    { value: "", label: "All Departments" },
                    ...departments.map((dept) => ({
                      value: dept.id,
                      label: `${dept.name} (${dept.abbreviation})`
                    }))
                  ]}
                  value={departmentId}
                  onChange={setDepartmentId}
                  placeholder="Select department"
                />
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                  Select a department to make this year specific to that department, or leave as "All Departments" for system-wide use
                </p>
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <button type="button" onClick={closeModal} className="btn-outline">
                  Cancel
                </button>
                <Button type="submit">{editingYear ? "Update" : "Create"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirmModal.open && (
        <div className="modal-overlay" onClick={closeDeleteConfirm}>
          <div 
            role="dialog" 
            aria-modal="true" 
            className="modal-content w-full max-w-md mx-4 p-6" 
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
              Delete Academic Year?
            </h3>
            <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
              Are you sure you want to delete <strong>{deleteConfirmModal.yearName}</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={closeDeleteConfirm} className="btn-outline" disabled={isDeleting}>
                Cancel
              </button>
              <Button 
                onClick={handleDelete} 
                disabled={isDeleting}
                style={{ backgroundColor: "var(--danger)", borderColor: "var(--danger)" }}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
