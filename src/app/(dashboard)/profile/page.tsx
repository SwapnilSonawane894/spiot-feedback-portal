"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";

export default function ProfilePage(): React.ReactElement {
  const { data: session } = useSession();
  const role = (session as any)?.user?.role;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [currentPasswordError, setCurrentPasswordError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/profile");
        if (!res.ok) throw new Error("Failed to fetch profile");
        const data = await res.json();
        setName(data.name || "");
        setEmail(data.email || "");
      } catch (err) {
        console.error(err);
      }
    }
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: any = { name };
      if (role !== "STUDENT" && (currentPassword || newPassword)) {
        // require both
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }

      setCurrentPasswordError(null);
      setGeneralError(null);
      const res = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        // handle incorrect password specially
        if (json?.error && json.error.toLowerCase().includes("incorrect current password")) {
          setCurrentPasswordError("Incorrect current password");
          return;
        }
        setGeneralError(json?.error || "Update failed");
        return;
      }
      toast.success("Profile updated");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      console.error(err);
      setGeneralError((err as Error).message || "Update failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">My Profile</h1>

      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
          <label className="text-sm font-medium">Email</label>
          <input value={email} disabled className="px-3 py-2 border rounded" />

          <label className="text-sm font-medium">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="px-3 py-2 border rounded" />

          {role !== "STUDENT" && (
            <>
              <label className="text-sm font-medium">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={`px-3 py-2 border rounded ${currentPasswordError ? "border-red-500" : "border-gray-300"}`}
              />
              {currentPasswordError && <div className="text-sm text-red-600 mt-1">{currentPasswordError}</div>}

              <label className="text-sm font-medium">New Password</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="px-3 py-2 border rounded" />
            </>
          )}

          {generalError && <div className="text-sm text-red-600">{generalError}</div>}

          <div className="flex justify-end">
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded" disabled={loading}>{loading ? "Saving..." : "Save Changes"}</button>
          </div>
        </form>
      </div>
    </main>
  );
}
