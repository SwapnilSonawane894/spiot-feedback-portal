"use client";

import React, { useState } from "react";
import Sidebar from "@/app/(dashboard)/sidebar";
import { Menu } from "lucide-react";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen flex">
      {/* Mobile hamburger */}
      <div className="md:hidden fixed top-4 left-4 z-40">
        <button onClick={() => setOpen((s) => !s)} className="p-2 bg-white rounded shadow">
          <Menu size={20} />
        </button>
      </div>

      <Sidebar isOpen={open} onClose={() => setOpen(false)} />

      <div className="flex-1 ml-0 md:ml-64 bg-gray-100 p-4">
        <main className="max-w-7xl mx-auto">{children}</main>
      </div>
    </div>
  );
}
