"use client";

import React from "react";
import PortalSidebar from "@/components/portal-sidebar";

type Props = {
  children: React.ReactNode;
  title?: string;
};

export default function PortalLayout({ children, title = "Page Title" }: Props) {
  return (
    <div className="min-h-screen flex bg-[#F0F0F0]">
      <PortalSidebar />

      <main className="flex-1 ml-[250px] p-4">
        <div className="max-w-[1100px] mx-auto">
          <header className="mb-6">
            <h1 className="text-2xl font-semibold">{title}</h1>
          </header>

          <div className="bg-white rounded-md shadow-sm border border-gray-100 p-6 min-h-[240px]">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
