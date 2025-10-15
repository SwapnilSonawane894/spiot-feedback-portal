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
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow p-8">
          <div className="flex flex-col items-center gap-4 mb-4">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
              {/* Image placeholder */}
              <Image src="/logo.png" alt="SPIOT logo" width={64} height={64} />
            </div>
            <h1 className="text-center text-lg font-semibold">Sharadchandra Pawar Institute of Technology, Someshwarnagar</h1>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && <p className="text-sm text-red-600">{error}</p>}

            <div>
              <label className="sr-only">Enrollment No. / Email</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                  <Mail size={16} />
                </span>
                <TextInput
                  label=""
                  placeholder="Enter your credentials"
                  type="text"
                  className="pl-10"
                  aria-label="Enrollment No. or Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="sr-only">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                  <Lock size={16} />
                </span>
                <TextInput
                  label=""
                  placeholder="Password"
                  type="password"
                  className="pl-10"
                  aria-label="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="text-right mt-2">
                <a href="#" className="text-sm text-blue-700 hover:underline">Forgot password?</a>
              </div>
            </div>

            <div>
              <PrimaryButton type="submit" disabled={isLoading}>
                {isLoading ? "Logging in..." : "LOGIN"}
              </PrimaryButton>
            </div>
          </form>
        </div>

        <div className="text-center text-sm text-gray-500 mt-4">© 2025-26 | Student Feedback Portal</div>
      </div>
    </div>
  );
}

