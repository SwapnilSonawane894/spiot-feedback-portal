"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Edit2, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui-controls";
import { CustomSelect } from "@/components/custom-select";

type Department = { id: string; name: string; abbreviation: string };
type Hod = {
  id: string;
  name?: string | null;
  email?: string | null;
  staffProfile?: { employeeId: string; designation: string; department?: Department | null } | null;
};

export default function ManageHodsPage(): React.ReactElement {
  const [hods, setHods] = useState<Hod[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHOD, setEditingHOD] = useState<Hod | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchHods();
    fetchDepartments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchHods() {
    try {
      const res = await fetch("/api/hods");
      if (!res.ok) throw new Error("Failed to fetch hods");
      const data = await res.json();
      setHods(data);
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
    if (!confirm("Delete this HOD account?")) return;
    try {
      const res = await fetch(`/api/hods/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setHods((prev) => prev.filter((h) => h.id !== id));
    } catch (err) {
      console.error(err);
      alert((err as Error).message || "Delete failed");
    }
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !departmentId) return;
    setIsSubmitting(true);
    try {
      if (editingHOD) {
        const res = await fetch(`/api/hods/${editingHOD.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, departmentId }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err?.error || "Failed to update HOD");
        }
        const updated = await res.json();
        setHods((prev) => prev.map((h) => (h.id === updated.id ? updated : h)));
        setEditingHOD(null);
      } else {
        if (!password) return;
        const res = await fetch("/api/hods", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password, departmentId }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err?.error || "Failed to create HOD");
        }
        const created = await res.json();
        setHods((prev) => [created, ...prev]);
      }

      setIsModalOpen(false);
      setName("");
      setEmail("");
      setPassword("");
      if (departments.length > 0) setDepartmentId(departments[0].id);
    } catch (err) {
      console.error(err);
      alert((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  }, [editingHOD, name, email, password, departmentId, departments]);

  const openCreateModal = useCallback(() => {
    setEditingHOD(null);
    setName("");
    setEmail("");
    setPassword("");
    setIsModalOpen(true);
  }, []);

  const openEditModal = useCallback((h: Hod) => {
    setEditingHOD(h);
    setName(h.name ?? "");
    setEmail(h.email ?? "");
    setDepartmentId(h.staffProfile?.department?.id ?? (departments.length > 0 ? departments[0].id : ""));
    setIsModalOpen(true);
  }, [departments]);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  return (
    <div className="min-h-screen">
      <main className="max-w-7xl mx-auto">
        <div className="flex items-start flex-col gap-3 justify-between mb-6">
          <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
            Manage HOD Accounts
          </h1>
          <Button onClick={openCreateModal} className="gap-2">
            <Plus size={18} />
            Create HOD Account
          </Button>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Assigned Department</th>
                <th>Email</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {hods.map((h) => (
                <tr key={h.id}>
                  <td>{h.name}</td>
                  <td>{h.staffProfile?.department?.name ?? "Unassigned"}</td>
                  <td>{h.email}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button
                        className="p-2 rounded-lg transition-colors hover:bg-[var(--hover-overlay)]"
                        style={{ color: "var(--text-secondary)" }}
                        aria-label="Edit"
                        onClick={() => openEditModal(h)}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(h.id)} 
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
      </main>

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
                  {editingHOD ? "Edit HOD Account" : "Create HOD Account"}
                </h3>
                <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                  {editingHOD ? "Update HOD details and department." : "Fill the details to create a new HOD and assign them to a department."}
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

              {!editingHOD && (
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

              <CustomSelect
                label="Department"
                options={departments.map((d) => ({
                  value: d.id,
                  label: `${d.name} (${d.abbreviation})`
                }))}
                value={departmentId}
                onChange={setDepartmentId}
              />

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={closeModal} className="btn-outline">
                  Cancel
                </button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (editingHOD ? "Saving..." : "Creating...") : (editingHOD ? "Save" : "Create HOD")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
