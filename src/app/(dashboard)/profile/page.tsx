"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { User, Mail, Lock } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { TextInput } from "@/components/ui-controls";

export default function ProfilePage(): React.ReactElement {
  const { data: session } = useSession();
  const role = (session as any)?.user?.role;

  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
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
        // console.error(err);
        toast.error("Failed to load profile");
      }
    }
    load();
  }, []);

  // Redirect students away from this page if they try to access directly
  useEffect(() => {
    if (role === "STUDENT") {
      router.replace("/student/dashboard");
    }
  }, [role, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: any = { name };
      // Only allow admins to change email from this page
      if (role === "ADMIN") payload.email = email;

      if (role !== "STUDENT" && (currentPassword || newPassword)) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }

      setCurrentPasswordError(null);
      setGeneralError(null);
      // Basic client-side email validation for admins
      if (role === "ADMIN" && payload.email) {
        const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
        if (!emailRegex.test(payload.email)) {
          setGeneralError("Invalid email format");
          setLoading(false);
          return;
        }
      }

      const res = await fetch("/api/profile", { 
        method: "PATCH", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify(payload) 
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        if (json?.error && json.error.toLowerCase().includes("incorrect current password")) {
          setCurrentPasswordError("Incorrect current password");
          return;
        }
        setGeneralError(json?.error || "Update failed");
        return;
      }
      toast.success("Profile updated successfully");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      // console.error(err);
      setGeneralError((err as Error).message || "Update failed");
      toast.error("Failed to update profile");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader 
        title="My Profile" 
        description="Manage your account settings and preferences"
      />

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl" style={{ background: "var(--primary-light)" }}>
              <User size={20} style={{ color: "var(--primary)" }} />
            </div>
            <div>
              <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>Account Information</h3>
              <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>Update your personal details</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="card-body">
          <div className="space-y-5">
            {generalError && (
              <div className="px-4 py-3 rounded-lg text-sm" style={{ background: "var(--danger-light)", color: "var(--danger)" }}>
                {generalError}
              </div>
            )}

            <div>
              <label className="form-label">
                <div className="flex items-center gap-2">
                  <Mail size={16} />
                  <span>Email Address</span>
                </div>
              </label>
              <input 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                disabled={role !== "ADMIN"}
                className="input-field"
              />
              <p className="form-helper">{role === "ADMIN" ? "Change your email address" : "Email cannot be changed"}</p>
            </div>

            <div>
              <label className="form-label">
                <div className="flex items-center gap-2">
                  <User size={16} />
                  <span>Full Name</span>
                </div>
              </label>
              <input 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                className="input-field"
                placeholder="Enter your full name"
              />
            </div>

            {role !== "STUDENT" && (
              <div className="pt-4 border-t" style={{ borderColor: "var(--card-border)" }}>
                <h4 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
                  Change Password
                </h4>
                
                <div className="space-y-4">
                  <div>
                    <label className="form-label">
                      <div className="flex items-center gap-2">
                        <Lock size={16} />
                        <span>Current Password</span>
                      </div>
                    </label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className={`input-field ${currentPasswordError ? "border-red-500" : ""}`}
                      placeholder="Enter current password"
                    />
                    {currentPasswordError && (
                      <p className="form-error">{currentPasswordError}</p>
                    )}
                  </div>

                  <div>
                    <label className="form-label">
                      <div className="flex items-center gap-2">
                        <Lock size={16} />
                        <span>New Password</span>
                      </div>
                    </label>
                    <input 
                      type="password" 
                      value={newPassword} 
                      onChange={(e) => setNewPassword(e.target.value)} 
                      className="input-field"
                      placeholder="Enter new password"
                    />
                    <p className="form-helper">Leave blank to keep current password</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-6 border-t" style={{ borderColor: "var(--card-border)" }}>
            <button 
              type="button" 
              className="btn-outline"
              onClick={() => {
                setName((session as any)?.user?.name || "");
                setCurrentPassword("");
                setNewPassword("");
                setCurrentPasswordError(null);
                setGeneralError(null);
              }}
            >
              Reset
            </button>
            <button 
              type="submit" 
              className="btn-primary" 
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="loading-spinner" />
                  Saving...
                </span>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
