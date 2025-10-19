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

      <div className="bg-white rounded shadow overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium" style={{ color: "var(--text-primary)" }}>Name</th>
              <th className="px-4 py-3 text-left font-medium" style={{ color: "var(--text-primary)" }}>Email</th>
              <th className="px-4 py-3 text-left font-medium" style={{ color: "var(--text-primary)" }}>Employee ID</th>
              <th className="px-4 py-3 text-left font-medium" style={{ color: "var(--text-primary)" }}>Designation</th>
              <th className="px-4 py-3 text-left font-medium" style={{ color: "var(--text-primary)" }}>Department</th>
              <th className="px-4 py-3 text-right font-medium" style={{ color: "var(--text-primary)" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {staff.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  No staff members found
                </td>
              </tr>
            ) : (
              staff.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="px-4 py-3">{s.user?.name || "—"}</td>
                  <td className="px-4 py-3">{s.user?.email || "—"}</td>
                  <td className="px-4 py-3">{s.employeeId || "—"}</td>
                  <td className="px-4 py-3">{s.designation || "—"}</td>
                  <td className="px-4 py-3">{s.department?.name || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(s)}
                        className="p-1.5 hover:bg-gray-100 rounded"
                        title="Edit"
                      >
                        <Pencil size={16} style={{ color: "var(--primary)" }} />
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="p-1.5 hover:bg-gray-100 rounded"
                        title="Delete"
                      >
                        <Trash2 size={16} style={{ color: "var(--danger)" }} />
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
                {editingStaff ? "Edit Staff" : "Add Staff"}
              </h2>
              <button onClick={closeModal} className="p-1 hover:bg-gray-100 rounded">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input w-full"
                  required
                  disabled={!!editingStaff}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>
                  Password {!editingStaff && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input w-full"
                  required={!editingStaff}
                  placeholder={editingStaff ? "Leave blank to keep current password" : ""}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>
                  Employee ID
                </label>
                <input
                  type="text"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="input w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>
                  Designation
                </label>
                <input
                  type="text"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="input w-full"
                  placeholder="e.g., Assistant Professor, Professor"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>
                  Department <span className="text-red-500">*</span>
                </label>
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="input w-full"
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
                  {isSubmitting ? (editingStaff ? "Saving..." : "Creating...") : (editingStaff ? "Save" : "Create Staff")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
