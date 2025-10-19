"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui-controls";
import { Plus } from "lucide-react";

type Year = { id: string; name: string; abbreviation: string };

export default function ManageYearsPage(): React.ReactElement {
  const [years, setYears] = useState<Year[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [abbrev, setAbbrev] = useState("");

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

  const openModal = useCallback(() => {
    setName("");
    setAbbrev("");
    setShowModal(true);
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
  }, []);

  return (
    <main className="max-w-4xl mx-auto">
      <div className="flex items-start flex-col gap-3 justify-between mb-6">
        <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
          Manage Academic Years
        </h1>
        <Button onClick={openModal} className="gap-2">
          <Plus size={18} />
          New Year
        </Button>
      </div>

      {loading ? (
        <div style={{ color: "var(--text-secondary)" }}>Loading…</div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Abbreviation</th>
              </tr>
            </thead>
            <tbody>
              {years.map((y) => (
                <tr key={y.id}>
                  <td>{y.name}</td>
                  <td>{y.abbreviation}</td>
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
              Create Academic Year
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
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
                <Button type="submit">Create</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
