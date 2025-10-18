"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Building2,
  Users,
  User,
  Book,
  Clipboard,
  LogOut,
  ClipboardList,
  GraduationCap,
  School,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import ThemeToggle from "./theme-toggle";

/* eslint-disable @typescript-eslint/no-explicit-any */

const adminLinks: Array<{ href: string; label: string; icon: React.ReactNode }> = [
  { href: "/admin", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
  { href: "/admin/departments", label: "Departments", icon: <Building2 size={20} /> },
  { href: "/admin/years", label: "Academic Years", icon: <GraduationCap size={20} /> },
  { href: "/admin/hods", label: "HOD Management", icon: <Users size={20} /> },
  { href: "/profile", label: "My Profile", icon: <User size={20} /> },
];

const hodLinks: Array<{ href: string; label: string; icon: React.ReactNode }> = [
  { href: "/hod/dashboard", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
  { href: "/hod/staff", label: "Staff Management", icon: <User size={20} /> },
  { href: "/hod/subjects", label: "Subject Management", icon: <Book size={20} /> },
  { href: "/hod/assignment", label: "Faculty Assignment", icon: <ClipboardList size={20} /> },
  { href: "/hod/students", label: "Student Management", icon: <School size={20} /> },
  { href: "/hod/reports", label: "Feedback Reports", icon: <Clipboard size={20} /> },
  { href: "/hod/submission-status", label: "Submission Status", icon: <ClipboardList size={20} /> },
  { href: "/profile", label: "My Profile", icon: <User size={20} /> },
];

const studentLinks: Array<{ href: string; label: string; icon: React.ReactNode }> = [
  { href: "/student/dashboard", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
  { href: "/profile", label: "My Profile", icon: <User size={20} /> },
];

const staffLinks: Array<{ href: string; label: string; icon: React.ReactNode }> = [
  { href: "/faculty/report", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
  { href: "/profile", label: "My Profile", icon: <User size={20} /> },
];

export default function ModernSidebar() {
  const pathname = usePathname() || "/";
  const { data: session } = useSession();
  const role = (session as any)?.user?.role;
  const userName = (session as any)?.user?.name;
  const [collapsed, setCollapsed] = useState(false);

  const links = role === "HOD" ? hodLinks : role === "STUDENT" ? studentLinks : role === "STAFF" ? staffLinks : adminLinks;

  const bestMatch = links.reduce<string | null>((best, l) => {
    if (!l.href) return best;
    if (pathname === l.href || pathname.startsWith(l.href + "/")) {
      if (!best) return l.href;
      return l.href.length > best.length ? l.href : best;
    }
    return best;
  }, null);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col fixed left-0 top-0 h-screen border-r transition-all duration-300 ${
          collapsed ? "w-20" : "w-64"
        }`}
        style={{
          background: "var(--sidebar-bg)",
          borderColor: "var(--sidebar-border)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-16 border-b" style={{ borderColor: "var(--sidebar-border)" }}>
          {!collapsed && (
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                style={{ background: "var(--primary)" }}
              >
                SP
              </div>
              <div>
                <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  {role === "HOD" ? "HOD Portal" : role === "STUDENT" ? "Student Portal" : role === "STAFF" ? "Faculty Portal" : "Admin Portal"}
                </div>
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {userName || "SPIOT"}
                </div>
              </div>
            </div>
          )}
          {collapsed && (
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm mx-auto"
              style={{ background: "var(--primary)" }}
            >
              SP
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className={`flex-1 overflow-y-auto py-4 ${collapsed ? "px-2" : "px-3"}`}>
          <div className="space-y-1">
            {links.map((item) => {
              const isActive = !!bestMatch && item.href === bestMatch;
              return (
                <Link key={item.href} href={item.href} className={isActive ? "nav-link-active" : "nav-link"} title={collapsed ? item.label : ""}>
                  <span className="shrink-0">{item.icon}</span>
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className={`border-t p-3 space-y-2`} style={{ borderColor: "var(--sidebar-border)" }}>
          <div className="flex items-center justify-center">
            <ThemeToggle />
          </div>
          <button onClick={() => signOut({ callbackUrl: "/login" })} className="nav-link w-full" title={collapsed ? "Logout" : ""}>
            <span className="shrink-0">
              <LogOut size={20} />
            </span>
            {!collapsed && <span>Logout</span>}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight size={20} style={{ color: "var(--text-secondary)" }} /> : <ChevronLeft size={20} style={{ color: "var(--text-secondary)" }} />}
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Tab Bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 h-16 border-t flex items-center justify-around z-50"
        style={{
          background: "var(--sidebar-bg)",
          borderColor: "var(--sidebar-border)",
        }}
      >
        {links.slice(0, 4).map((item) => {
          const isActive = !!bestMatch && item.href === bestMatch;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all duration-200 ${
                isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-600 dark:text-gray-400"
              }`}
            >
              <span>{item.icon}</span>
              <span className="text-xs font-medium">{item.label.split(" ")[0]}</span>
            </Link>
          );
        })}
        {links.length > 4 && (
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all duration-200 text-gray-600 dark:text-gray-400"
          >
            <LogOut size={20} />
            <span className="text-xs font-medium">Logout</span>
          </button>
        )}
      </nav>
    </>
  );
}
