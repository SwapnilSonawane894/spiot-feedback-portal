/*
  Root page (Server Component)
  - Redirects users based on their session/role
*/

import { getServerSession } from "next-auth/next";
import type { Session } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export default async function Page() {
  const session = (await getServerSession(authOptions as any)) as Session | null;

  // Not logged in -> send to login
  if (!session) {
    redirect("/login");
  }

  // If logged in, route by role
  const role = (session?.user as any)?.role as string;
  if (role === "ADMIN") {
    redirect("/admin");
  }

  if (role === "HOD") {
    redirect("/hod/dashboard");
  }

  if (role === "FACULTY") {
    redirect("/faculty/dashboard");
  }

  if (role === "STUDENT") {
    redirect("/student/dashboard");
  }

  // Fallback
  redirect("/login");
}