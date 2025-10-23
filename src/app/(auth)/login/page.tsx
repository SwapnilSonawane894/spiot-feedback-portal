/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Mail, Lock } from "lucide-react";
import { signIn, SignInResponse } from "next-auth/react";
import { useRouter } from "next/navigation";
import LoadingOverlay from "@/components/loading-overlay";

export default function LoginPage(): React.JSX.Element {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setIsLoading(true);

    try {
      const result = (await signIn("credentials", {
        redirect: false,
        email,
        password,
      })) as SignInResponse | null;

      if (result?.error) {
        setError("Invalid credentials.");
        setIsLoading(false);
        return;
      }

      if (result?.ok) {
        setIsNavigating(true);

        try {
          // Fetch the session to get user role
          const sessionRes = await fetch('/api/auth/session');

          if (!sessionRes.ok) {
            throw new Error('Failed to fetch session');
          }

          const sessionData = await sessionRes.json();
          const role = sessionData?.user?.role;

          // Redirect based on role
          if (role === "ADMIN") {
            router.push("/admin");
          } else if (role === "HOD") {
            router.push("/hod/dashboard");
          } else if (role === "FACULTY") {
            router.push("/faculty/dashboard");
          } else if (role === "STUDENT") {
            router.push("/student/dashboard");
          } else {
            router.push("/");
          }
          return;
        } catch (sessionErr) {
          console.error('Session fetch error:', sessionErr);
          setError("Login successful but failed to load dashboard. Please refresh the page.");
          setIsNavigating(false);
          setIsLoading(false);
          return;
        }
      }

      setError("Login failed. Please try again.");
      setIsLoading(false);
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred.");
      setIsLoading(false);
    }
  }

  if (isNavigating || isLoading) {
    return <LoadingOverlay />;
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center sm:p-6 md:p-8"
      style={{ background: "var(--background)" }}
    >
      <div className="w-full min-h-screen sm:min-h-0 sm:max-w-md fade-in flex flex-col justify-center">
        <div className="login-card p-8 sm:p-8 md:p-10">
          <div className="flex flex-col items-center mb-8 sm:mb-10">
            <div className="flex justify-center mb-6">
  <div className="relative w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48">
    <Image
      src="/logo.png"
      alt="SPIOT logo"
      fill
      priority
      className="object-contain"
    />
  </div>
</div>


            <h1 className="text-center text-xl sm:text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
              SPIOT Feedback Portal
            </h1>
            <p className="text-center text-sm" style={{ color: "var(--text-secondary)" }}>
              Sharadchandra Pawar Institute of Technology
            </p>
          </div>

          <form className="space-y-5 sm:space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div
                className="px-4 py-3 rounded-lg text-sm font-medium slide-in-right"
                style={{ background: "var(--danger-light)", color: "var(--danger)" }}
              >
                {error}
              </div>
            )}

            <div>
              <label className="form-label">Email / Enrollment Number</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none" style={{ color: "var(--text-muted)" }}>
                  <Mail size={18} />
                </span>
                <input
                  type="text"
                  placeholder="Enter your credentials"
                  style={{ paddingLeft: '3.5rem' }}
                  className="input-field"
                  aria-label="Email or Enrollment Number"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="form-label">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none" style={{ color: "var(--text-muted)" }}>
                  <Lock size={18} />
                </span>
                <input
                  type="password"
                  placeholder="Enter your password"
                  style={{ paddingLeft: '3.5rem' }}
                  className="input-field"
                  aria-label="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-3.5 text-base font-semibold mt-6"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="loading-spinner" />
                  Logging in...
                </span>
              ) : (
                "Login"
              )}
            </button>
          </form>
        </div>

        <div className="text-center text-xs mt-6 sm:mt-8 px-4" style={{ color: "var(--text-muted)" }}>
          © 2025-26 SPIOT | Student Feedback Portal
        </div>
      </div>
    </div>
  );
}

