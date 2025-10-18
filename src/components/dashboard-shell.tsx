"use client";

import React from "react";
import ModernSidebar from "@/components/modern-sidebar";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      <ModernSidebar />

      <div className="flex-1 md:ml-64 pb-16 md:pb-0 transition-all duration-300 fade-in" style={{ background: "var(--background)" }}>
        <main className="page-container py-6 md:py-8">{children}</main>
      </div>
    </div>
  );
}
