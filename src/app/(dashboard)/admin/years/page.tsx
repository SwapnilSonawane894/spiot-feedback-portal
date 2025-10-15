"use client";

import React, { useEffect, useState } from "react";

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

  async function handleCreate(e: React.FormEvent) {
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
  }

  return (
    <main className="max-w-4xl mx-auto">
      <div className="flex items-start flex-col gap-3 justify-between mb-6">
        <h1 className="text-2xl font-semibold">Manage Academic Years</h1>
        <button onClick={() => setShowModal(true)} className="px-3 py-2 bg-blue-600 text-white rounded">New Year</button>
      </div>

      {loading ? (
        <div>Loading…</div>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-left">
              <th className="py-2">Name</th>
              <th className="py-2">Abbreviation</th>
            </tr>
          </thead>
          <tbody>
            {years.map((y) => (
              <tr key={y.id} className="border-t">
                <td className="py-2">{y.name}</td>
                <td className="py-2">{y.abbreviation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white p-6 rounded shadow max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">Create Academic Year</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-sm font-medium">Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full border rounded px-2 py-1" />
              </div>
              <div>
                <label className="block text-sm font-medium">Abbreviation</label>
                <input value={abbrev} onChange={(e) => setAbbrev(e.target.value)} className="mt-1 block w-full border rounded px-2 py-1" />
              </div>
              <div className="flex gap-2 justify-end pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-3 py-1 border rounded">Cancel</button>
                <button type="submit" className="px-3 py-1 bg-blue-600 text-white rounded">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
