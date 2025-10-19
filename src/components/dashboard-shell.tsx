"use client";

import React, { createContext, useContext, useState } from "react";
import ModernSidebar from "@/components/modern-sidebar";

// Create a context to share sidebar collapse state
const SidebarContext = createContext<{ collapsed: boolean; setCollapsed: (value: boolean) => void }>({
  collapsed: false,
  setCollapsed: () => {},
});

export const useSidebarContext = () => useContext(SidebarContext);

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed }}>
      <div className="min-h-screen flex">
        <ModernSidebar collapsed={collapsed} setCollapsed={setCollapsed} />

        <div 
          className={`flex-1 pb-16 md:pb-0 transition-all duration-300 fade-in ${
            collapsed ? "md:ml-20" : "md:ml-64"
          }`} 
          style={{ background: "var(--background)" }}
        >
          <main className="page-container py-6 md:py-8">{children}</main>
        </div>
      </div>
    </SidebarContext.Provider>
  );
}
