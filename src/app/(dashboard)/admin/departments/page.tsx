"use client";

import React, { useEffect, useState } from "react";
import ConfirmationModal from "@/components/confirmation-modal";
import { Edit2, Trash2 } from "lucide-react";

type Department = {
  id: string;
  name: string;
  abbreviation: string;
};

export default function ManageDepartmentsPage(): React.ReactElement {
  const [departments, setDepartments] = useState<Department[]>([]);
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
    try {
      const res = await fetch("/api/departments");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setDepartments(data);
    } catch (err) {
      console.error(err);
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
    <div className="min-h-screen">
      <main className="max-w-7xl mx-auto">
        <div className="flex items-start flex-col gap-3 justify-between mb-6">
          <h1 className="text-2xl font-semibold">Manage Departments</h1>
          <button
            onClick={() => {
              setEditingDepartment(null);
              setDepartmentName("");
              setDepartmentAbbreviation("");
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            + Add New Department
          </button>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-gray-700">Department Name</th>
                <th className="px-6 py-3 text-left text-gray-700">Abbreviation</th>
                <th className="px-6 py-3 text-left text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {departments.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3">{d.name}</td>
                  <td className="px-6 py-3">{d.abbreviation}</td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingDepartment(d);
                          setDepartmentName(d.name);
                          setDepartmentAbbreviation(d.abbreviation);
                          setIsModalOpen(true);
                        }}
                        className="p-2 rounded hover:bg-gray-100 text-gray-600"
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
                        className="p-2 rounded hover:bg-gray-100 text-red-600"
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

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsModalOpen(false)} aria-hidden />
          <div role="dialog" aria-modal="true" className="relative bg-white rounded-lg shadow-xl w-full max-w-xl mx-4 p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">{editingDepartment ? "Edit Department" : "Add New Department"}</h3>
                <p className="text-sm text-gray-500 mt-1">Enter department details below.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-700 ml-4" aria-label="Close modal">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-1 gap-3">
              <label className="text-sm font-medium text-gray-700">Department Name</label>
              <input value={departmentName} onChange={(e) => setDepartmentName(e.target.value)} className="w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-blue-700" />

              <label className="text-sm font-medium text-gray-700">Abbreviation</label>
              <input value={departmentAbbreviation} onChange={(e) => setDepartmentAbbreviation(e.target.value)} className="w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-blue-700" />

              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-md text-gray-700 border">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">{isSubmitting ? "Saving..." : "Save"}</button>
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
