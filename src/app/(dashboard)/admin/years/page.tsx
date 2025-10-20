"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui-controls";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { SkeletonTable, SkeletonPulse } from "@/components/skeletons";

type Year = { id: string; name: string; abbreviation: string };

export default function ManageYearsPage(): React.ReactElement {
  const [years, setYears] = useState<Year[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [abbrev, setAbbrev] = useState("");
  const [editingYear, setEditingYear] = useState<Year | null>(null);

  useEffect(() => {
    fetchYears();
  }, []);

  async function fetchYears() {
    setLoading(true);
    try {
      const res = await fetch("/api/years");
      const data = await res.json();
      setYears(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleCreate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/years", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, abbreviation: abbrev }),
      });
      if (!res.ok) throw new Error("Failed to create");
      setName("");
      setAbbrev("");
      setShowModal(false);
      fetchYears();
    } catch (err) {
      console.error(err);
      alert((err as Error).message || "Create failed");
    }
  }, [name, abbrev]);

  const handleUpdate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingYear) return;
    
    try {
      const res = await fetch(`/api/years/${editingYear.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, abbreviation: abbrev }),
      });
      if (!res.ok) throw new Error("Failed to update");
      setName("");
      setAbbrev("");
      setEditingYear(null);
      setShowModal(false);
      fetchYears();
    } catch (err) {
      console.error(err);
      alert((err as Error).message || "Update failed");
    }
  }, [name, abbrev, editingYear]);

  const handleDelete = useCallback(async (yearId: string, yearName: string) => {
    if (!confirm(`Are you sure you want to delete "${yearName}"?`)) return;
    
    try {
      const res = await fetch(`/api/years/${yearId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      fetchYears();
    } catch (err) {
      console.error(err);
      alert((err as Error).message || "Delete failed");
    }
  }, []);

  const openCreateModal = useCallback(() => {
    setName("");
    setAbbrev("");
    setEditingYear(null);
    setShowModal(true);
  }, []);

  const openEditModal = useCallback((year: Year) => {
    setName(year.name);
    setAbbrev(year.abbreviation);
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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {years.map((y) => (
                <tr key={y.id}>
                  <td>{y.name}</td>
                  <td>{y.abbreviation}</td>
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
                        onClick={() => handleDelete(y.id, y.name)}
                        className="btn-icon text-red-600 hover:text-red-700"
                        title="Delete"
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
                  required
                />
              </div>
              <div>
                <label className="form-label">Abbreviation</label>
                <input 
                  value={abbrev} 
                  onChange={(e) => setAbbrev(e.target.value)} 
                  className="input-field"
                  required
                />
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
    </main>
  );
}
