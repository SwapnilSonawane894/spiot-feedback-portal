/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Mail, Lock } from "lucide-react";
import { PrimaryButton, TextInput } from "@/components/ui-controls";
import { signIn, SignInResponse, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage(): React.JSX.Element {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { data: session, status } = useSession();
  const [signedIn, setSignedIn] = useState(false);

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
        // mark that signIn returned ok and wait for session to become authenticated
        setSignedIn(true);
        return;
      }

      setError("Login failed. Please try again.");
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    // when signIn returns ok, wait for session status to become authenticated
    if (!signedIn) return;
    if (status !== "authenticated") return;

    const role = (session as any)?.user?.role;
    if (role === "ADMIN") {
      router.push("/admin");
      return;
    }

    if (role === "HOD") {
      router.push("/hod/dashboard");
      return;
    }

    if (role === "STAFF") {
      router.push("/faculty/report");
      return;
    }

    if (role === "STUDENT") {
      router.push("/student/dashboard");
      return;
    }

    router.push("/");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn, status, session]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6" style={{ background: "var(--background)" }}>
      <div className="w-full max-w-md fade-in">
        <div className="card p-6 sm:p-8">
          <div className="flex flex-col items-center gap-3 sm:gap-4 mb-8">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center transition-transform hover:scale-105" style={{ background: "var(--primary-light)" }}>
              <Image src="/logo.png" alt="SPIOT logo" width={64} height={64} style={{ height: "auto" }} />
            </div>
            <h1 className="text-center text-base sm:text-lg font-bold" style={{ color: "var(--text-primary)" }}>
              Sharadchandra Pawar Institute of Technology, Someshwarnagar
            </h1>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="px-4 py-3 rounded-lg text-sm slide-in-right" style={{ background: "var(--danger-light)", color: "var(--danger)" }}>
                {error}
              </div>
            )}

            <div>
              <label className="sr-only">Enrollment No. / Email</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center" style={{ color: "var(--text-muted)" }}>
                  <Mail size={18} />
                </span>
                <input
                  type="text"
                  placeholder="Enter your credentials"
                  className="input-field pl-11"
                  aria-label="Enrollment No. or Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="sr-only">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center" style={{ color: "var(--text-muted)" }}>
                  <Lock size={18} />
                </span>
                <input
                  type="password"
                  placeholder="Password"
                  className="input-field pl-11"
                  aria-label="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="text-right mt-2">
                <a href="#" className="text-sm hover:underline transition-colors" style={{ color: "var(--primary)" }}>
                  Forgot password?
                </a>
              </div>
            </div>

            <div className="pt-2">
              <button type="submit" disabled={isLoading} className="btn-primary w-full text-base font-semibold">
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="loading-spinner" />
                    Logging in...
                  </span>
                ) : (
                  "Login"
                )}
              </button>
            </div>
          </form>
        </div>

        <div className="text-center text-sm mt-4" style={{ color: "var(--text-muted)" }}>
          © 2025-26 | Student Feedback Portal
        </div>
      </div>
    </div>
  );
}

