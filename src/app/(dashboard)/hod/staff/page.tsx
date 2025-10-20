"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { UserPlus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui-controls";
import toast from "react-hot-toast";

type Department = {
  id: string;
  name: string;
  abbreviation?: string;
};

type StaffRow = {
  id: string;
  user: { id: string; name?: string | null; email?: string | null };
  departmentId: string;
  department?: Department | null;
};

export default function ManageStaffPage(): React.ReactElement {
  const { data: session } = useSession();
  const currentUserId = (session as any)?.user?.id;
  const [staffList, setStaffList] = useState<StaffRow[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffRow | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchStaff();
    fetchDepartments();
  }, []);

  async function fetchStaff() {
    try {
      const res = await fetch("/api/staff");
      if (!res.ok) throw new Error("Failed to fetch staff");
      const data = await res.json();
      setStaffList(data || []);
    } catch (err) {
      console.error(err);
      setStaffList([]);
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

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingStaff) {
        const res = await fetch(`/api/staff/${editingStaff.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, departmentId }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err?.error || "Failed to update staff");
        }
        await fetchStaff();
        toast.success("Staff member updated successfully");
        setEditingStaff(null);
      } else{
        if (!name || !email || !password || !departmentId) return;
        const res = await fetch("/api/staff", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password, departmentId }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err?.error || "Failed to create staff");
        }
        await fetchStaff();
        toast.success("Staff member created successfully");
      }

      setIsModalOpen(false);
      setName("");
      setEmail("");
      setPassword("");
    } catch (err) {
      console.error(err);
      toast.error((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  }, [editingStaff, name, email, password, departmentId]);

  const openCreateModal = useCallback(() => {
    setEditingStaff(null);
    setName("");
    setEmail("");
    setPassword("");
    if (departments.length > 0) setDepartmentId(departments[0].id);
    setIsModalOpen(true);
  }, [departments]);

  const openEditModal = useCallback((s: StaffRow) => {
    setEditingStaff(s);
    setName(s.user?.name ?? "");
    setEmail(s.user?.email ?? "");
    setPassword("");
    setDepartmentId(s.department?.id || (departments.length > 0 ? departments[0].id : ""));
    setIsModalOpen(true);
  }, [departments]);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const handleDelete = useCallback(async (s: StaffRow) => {
    const ok = confirm(`Delete staff member ${s.user?.name ?? s.user?.email ?? s.id}? This will also remove the user.`);
    if (!ok) return;
    try {
      setDeletingId(s.id);
      const res = await fetch(`/api/staff/${s.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.error || "Failed to delete staff");
      }
      setStaffList((prev) => prev.filter((p) => p.id !== s.id));
      toast.success("Staff member deleted successfully");
    } catch (err) {
      console.error(err);
      toast.error((err as Error).message);
    } finally {
      setDeletingId(null);
    }
  }, []);

  return (
    <div className="page-container">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
          Manage Department Staff
        </h1>
        <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
          Add, edit, or remove staff members from your department
        </p>
        <Button onClick={openCreateModal} className="gap-2">
          <UserPlus size={16} />
          <span>Add New Staff Member</span>
        </Button>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {staffList.length === 0 ? (
              <tr>
                <td colSpan={3} className="text-center py-8" style={{ color: "var(--text-muted)" }}>
                  No staff members found. Add one to get started.
                </td>
              </tr>
            ) : (
              staffList.map((s) => (
                <tr key={s.id}>
                  <td>{s.user?.name ?? "-"}</td>
                  <td>{s.user?.email ?? "-"}</td>
                  <td>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditModal(s)}
                        className="btn-icon"
                        title="Edit"
                        disabled={s.user?.id === currentUserId}
                        style={s.user?.id === currentUserId ? { opacity: 0.5, cursor: "not-allowed" } : {}}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(s)}
                        className="btn-icon text-red-600 hover:text-red-700"
                        title="Delete"
                        disabled={s.user?.id === currentUserId || deletingId === s.id}
                        style={s.user?.id === currentUserId ? { opacity: 0.5, cursor: "not-allowed" } : {}}
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
            role="dialog" 
            aria-modal="true" 
            className="modal-content w-full max-w-md mx-4 p-6" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                  {editingStaff ? "Edit Staff Member" : "Add Staff Member"}
                </h3>
                <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                  {editingStaff ? "Edit details for this staff member." : "Create a new staff member for your department."}
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
                <label className="form-label">Name</label>
                <input 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="form-label">Email</label>
                <input 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  type="email" 
                  className="input-field"
                  required
                />
              </div>

              {!editingStaff && (
                <div>
                  <label className="form-label">Password</label>
                  <input 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    type="password" 
                    className="input-field"
                    required
                  />
                </div>
              )}

              <div>
                <label className="form-label">Department *</label>
                <select 
                  value={departmentId} 
                  onChange={(e) => setDepartmentId(e.target.value)} 
                  className="input-field"
                  required
                >
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name} {dept.abbreviation ? `(${dept.abbreviation})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={closeModal} className="btn-outline">
                  Cancel
                </button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : (editingStaff ? "Save" : "Create")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
