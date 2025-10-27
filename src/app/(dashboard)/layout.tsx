/* eslint-disable @typescript-eslint/no-explicit-any */
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";
import React from "react";
// Import the client-side DashboardShell directly. It's a client component so Next will handle it correctly.
import DashboardShell from "@/components/dashboard-shell";

export const metadata = {
  title: "SPIOT Dashboard",
};

// Server-side layout that protects dashboard routes and renders the client Sidebar
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions as any);
  if (!session) redirect("/login");

  return (
    <DashboardShell>
      {children}
    </DashboardShell>
  );
}
