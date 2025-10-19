"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Trash2, Pencil, Plus, X } from "lucide-react";
import { Button } from "@/components/ui-controls";

type Department = {
  id: string;
  name: string;
  abbreviation?: string;
};

type Staff = {
  id: string;
  employeeId?: string;
  designation?: string;
  user?: {
    id: string;
    name?: string | null;
    email?: string | null;
  } | null;
  department?: Department | null;
};

export default function ManageStaffPage(): React.ReactElement {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [designation, setDesignation] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchStaff();
    fetchDepartments();
  }, []);

  async function fetchStaff() {
    try {
      const res = await fetch("/api/staff");
      if (!res.ok) throw new Error("Failed to fetch staff");
      const data = await res.json();
      setStaff(data);
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchDepartments() {
    try {
      const res = await fetch("/api/departments");
      if (!res.ok) throw new Error("Failed to fetch departments");
      const data = await res.json();
      setDepartments(data);
      if (data.length > 0) setDepartmentId(data[0].id);
    } catch (err) {
      console.error(err);
    }
  }

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Delete this staff member?")) return;
    try {
      const res = await fetch(`/api/staff/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setStaff((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error(err);
      alert((err as Error).message || "Delete failed");
    }
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !departmentId) return;
    if (!editingStaff && !password) {
      alert("Password is required for new staff");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingStaff) {
        const res = await fetch(`/api/staff/${editingStaff.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, employeeId, designation, departmentId }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err?.error || "Failed to update staff");
        }
        await fetchStaff();
        setEditingStaff(null);
      } else {
        const res = await fetch("/api/staff", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password, employeeId, designation, departmentId }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err?.error || "Failed to create staff");
        }
        await fetchStaff();
      }

      setIsModalOpen(false);
      setName("");
      setEmail("");
      setPassword("");
      setEmployeeId("");
      setDesignation("");
    } catch (err) {
      console.error(err);
      alert((err as Error).message || "Save failed");
    } finally {
      setIsSubmitting(false);
    }
  }, [name, email, password, employeeId, designation, departmentId, editingStaff]);

  const openCreateModal = useCallback(() => {
    setEditingStaff(null);
    setName("");
    setEmail("");
    setPassword("");
    setEmployeeId("");
    setDesignation("");
    if (departments.length > 0) setDepartmentId(departments[0].id);
    setIsModalOpen(true);
  }, [departments]);

  const openEditModal = useCallback((staffMember: Staff) => {
    setEditingStaff(staffMember);
    setName(staffMember.user?.name || "");
    setEmail(staffMember.user?.email || "");
    setPassword("");
    setEmployeeId(staffMember.employeeId || "");
    setDesignation(staffMember.designation || "");
    setDepartmentId(staffMember.department?.id || (departments.length > 0 ? departments[0].id : ""));
    setIsModalOpen(true);
  }, [departments]);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingStaff(null);
    setName("");
    setEmail("");
    setPassword("");
    setEmployeeId("");
    setDesignation("");
  }, []);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
          Staff Management
        </h1>
        <Button onClick={openCreateModal}>
          <Plus size={16} className="mr-2" />
          Add Staff
        </Button>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Employee ID</th>
              <th>Designation</th>
              <th>Department</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {staff.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8" style={{ color: "var(--text-muted)" }}>
                  No staff members found
                </td>
              </tr>
            ) : (
              staff.map((s) => (
                <tr key={s.id}>
                  <td>{s.user?.name || "—"}</td>
                  <td>{s.user?.email || "—"}</td>
                  <td>{s.employeeId || "—"}</td>
                  <td>{s.designation || "—"}</td>
                  <td>{s.department?.name || "—"}</td>
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
                        onClick={() => handleDelete(s.id)}
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

      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div 
            className="modal-content max-w-md w-full mx-4" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
                  {editingStaff ? "Edit Staff" : "Add Staff"}
                </h2>
                <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                  {editingStaff ? "Update staff member information" : "Add a new staff member to the system"}
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

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="form-label">
                  Name <span style={{ color: "var(--danger)" }}>*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="form-label">
                  Email <span style={{ color: "var(--danger)" }}>*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                  required
                  disabled={!!editingStaff}
                />
              </div>

              <div>
                <label className="form-label">
                  Password {!editingStaff && <span style={{ color: "var(--danger)" }}>*</span>}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field"
                  required={!editingStaff}
                  placeholder={editingStaff ? "Leave blank to keep current password" : ""}
                />
              </div>

              <div>
                <label className="form-label">Employee ID</label>
                <input
                  type="text"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label className="form-label">Designation</label>
                <input
                  type="text"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="input-field"
                  placeholder="e.g., Assistant Professor, Professor"
                />
              </div>

              <div>
                <label className="form-label">
                  Department <span style={{ color: "var(--danger)" }}>*</span>
                </label>
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="input-field"
                  required
                >
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name} ({dept.abbreviation})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button type="button" onClick={closeModal} className="btn-outline">
                  Cancel
                </button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (editingStaff ? "Saving..." : "Creating...") : (editingStaff ? "Save Changes" : "Create Staff")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
