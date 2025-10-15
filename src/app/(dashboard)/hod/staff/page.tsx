"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { UserPlus, Edit, Trash } from "lucide-react";

type StaffRow = {
  id: string;
  user: { id: string; name?: string | null; email?: string | null };
  departmentId: string;
};

export default function ManageStaffPage(): React.ReactElement {
  const { data: session } = useSession();
  const currentUserId = (session as any)?.user?.id;
  const [staffList, setStaffList] = useState<StaffRow[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffRow | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchStaff();
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingStaff) {
        // update existing staff (patch user)
        const res = await fetch(`/api/staff/${editingStaff.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err?.error || "Failed to update staff");
        }
        const updated = await res.json();
        setStaffList((prev) => prev.map((s) => (s.id === updated?.id ? updated : s)));
        setEditingStaff(null);
      } else {
        if (!name || !email || !password) return;
        const res = await fetch("/api/staff", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err?.error || "Failed to create staff");
        }
        const created = await res.json();
        setStaffList((prev) => [created, ...prev]);
      }

      setIsModalOpen(false);
      setName("");
      setEmail("");
      setPassword("");
    } catch (err) {
      console.error(err);
      alert((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen max-w-6xl mx-auto">
      <div className="flex items-start flex-col gap-3 justify-between mb-6">
        <h1 className="text-2xl font-semibold">Manage Department Staff</h1>
        <button onClick={() => {
          setEditingStaff(null);
          setName("");
          setEmail("");
          setPassword("");
          setIsModalOpen(true);
        }} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
          <UserPlus size={16} /> <span>+ Add New Staff Member</span>
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-gray-700">Name</th>
              <th className="px-6 py-3 text-left text-gray-700">Email</th>
              <th className="px-6 py-3 text-left text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {staffList.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-6 py-3">{s.user?.name ?? "-"}</td>
                <td className="px-6 py-3">{s.user?.email ?? "-"}</td>
                <td className="px-6 py-3 flex gap-2">
                  {s.user?.id === currentUserId ? (
                    <span className="text-gray-400">Cannot edit self</span>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setEditingStaff(s);
                          setName(s.user?.name ?? "");
                          setEmail(s.user?.email ?? "");
                          setPassword("");
                          setIsModalOpen(true);
                        }}
                        className="text-gray-500 hover:text-gray-700"
                        title="Edit"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={async () => {
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
                          } catch (err) {
                            console.error(err);
                            alert((err as Error).message);
                          } finally {
                            setDeletingId(null);
                          }
                        }}
                        className={`text-red-500 hover:text-red-700 ${deletingId === s.id ? "opacity-50 pointer-events-none" : ""}`}
                        title="Delete"
                      >
                        <Trash size={16} />
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsModalOpen(false)} aria-hidden />
          <div role="dialog" aria-modal className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">{editingStaff ? "Edit Staff Member" : "Add Staff Member"}</h3>
                <p className="text-sm text-gray-500 mt-1">{editingStaff ? "Edit details for this staff member." : "Create a new staff member for your department."}</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-700 ml-4">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-1 gap-3">
              <label className="text-sm font-medium text-gray-700">Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 rounded-md border border-gray-300" />

              <label className="text-sm font-medium text-gray-700">Email</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="w-full px-3 py-2 rounded-md border border-gray-300" />

              <label className="text-sm font-medium text-gray-700">Password</label>
              <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" className="w-full px-3 py-2 rounded-md border border-gray-300" />

              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-md text-gray-700 border">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
                  {isSubmitting ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
