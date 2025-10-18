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
  MoreHorizontal,
  Briefcase,
  FileText,
} from "lucide-react";
import ThemeToggle from "./theme-toggle";

/* eslint-disable @typescript-eslint/no-explicit-any */

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  group?: string;
};

const adminLinks: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
  { href: "/admin/departments", label: "Departments", icon: <Building2 size={20} /> },
  { href: "/admin/years", label: "Academic Years", icon: <GraduationCap size={20} /> },
  { href: "/admin/hods", label: "HOD Management", icon: <Users size={20} /> },
  { href: "/profile", label: "My Profile", icon: <User size={20} /> },
];

const hodLinks: NavItem[] = [
  { href: "/hod/dashboard", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
  { href: "/hod/staff", label: "Staff Management", icon: <User size={20} />, group: "management" },
  { href: "/hod/subjects", label: "Subject Management", icon: <Book size={20} />, group: "management" },
  { href: "/hod/students", label: "Student Management", icon: <School size={20} />, group: "management" },
  { href: "/hod/assignment", label: "Faculty Assignment", icon: <ClipboardList size={20} /> },
  { href: "/hod/reports", label: "Feedback Reports", icon: <Clipboard size={20} />, group: "reports" },
  { href: "/hod/submission-status", label: "Submission Status", icon: <FileText size={20} />, group: "reports" },
  { href: "/profile", label: "My Profile", icon: <User size={20} />, group: "more" },
];

const studentLinks: NavItem[] = [
  { href: "/student/dashboard", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
  { href: "/profile", label: "My Profile", icon: <User size={20} /> },
];

const staffLinks: NavItem[] = [
  { href: "/faculty/report", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
  { href: "/profile", label: "My Profile", icon: <User size={20} /> },
];

export default function ModernSidebar() {
  const pathname = usePathname() || "/";
  const { data: session } = useSession();
  const role = (session as any)?.user?.role;
  const userName = (session as any)?.user?.name;
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileGroupOpen, setMobileGroupOpen] = useState<string | null>(null);

  const links = role === "HOD" ? hodLinks : role === "STUDENT" ? studentLinks : role === "STAFF" ? staffLinks : adminLinks;

  const bestMatch = links.reduce<string | null>((best, l) => {
    if (!l.href) return best;
    if (pathname === l.href || pathname.startsWith(l.href + "/")) {
      if (!best) return l.href;
      return l.href.length > best.length ? l.href : best;
    }
    return best;
  }, null);

  // For HOD mobile view, create grouped tabs
  const getMobileTabsForHOD = () => {
    return [
      { href: "/hod/dashboard", label: "Dashboard", icon: <LayoutDashboard size={20} />, type: "link" as const },
      { href: "#", label: "Manage", icon: <Briefcase size={20} />, type: "group" as const, groupKey: "management" },
      { href: "/hod/assignment", label: "Assign", icon: <ClipboardList size={20} />, type: "link" as const },
      { href: "#", label: "Reports", icon: <FileText size={20} />, type: "group" as const, groupKey: "reports" },
      { href: "#", label: "More", icon: <MoreHorizontal size={20} />, type: "menu" as const },
    ];
  };

  const mobileTabsHOD = role === "HOD" ? getMobileTabsForHOD() : null;

  const getGroupItems = (groupKey: string) => {
    return links.filter(link => link.group === groupKey);
  };

  const isActiveInGroup = (groupKey: string) => {
    return links.some(link => link.group === groupKey && bestMatch === link.href);
  };

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
            {links.filter(link => !link.group || link.group === "management" || link.group === "reports").map((item) => {
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
      {role === "HOD" && mobileTabsHOD ? (
        <nav
          className="md:hidden fixed bottom-0 left-0 right-0 h-16 border-t flex items-center justify-around z-50 px-2"
          style={{
            background: "var(--sidebar-bg)",
            borderColor: "var(--sidebar-border)",
          }}
        >
          {mobileTabsHOD.map((tab, idx) => {
            if (tab.type === "link") {
              const isActive = bestMatch === tab.href;
              return (
                <Link
                  key={idx}
                  href={tab.href}
                  className={`flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-lg transition-all duration-200 ${
                    isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-600 dark:text-gray-400"
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span className="text-xs font-medium">{tab.label}</span>
                </Link>
              );
            } else if (tab.type === "group") {
              const isActive = isActiveInGroup(tab.groupKey!);
              return (
                <button
                  key={idx}
                  onClick={() => setMobileGroupOpen(mobileGroupOpen === tab.groupKey ? null : tab.groupKey!)}
                  className={`flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-lg transition-all duration-200 ${
                    isActive || mobileGroupOpen === tab.groupKey ? "text-blue-600 dark:text-blue-400" : "text-gray-600 dark:text-gray-400"
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span className="text-xs font-medium">{tab.label}</span>
                </button>
              );
            } else {
              return (
                <button
                  key={idx}
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className={`flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-lg transition-all duration-200 ${
                    mobileMenuOpen ? "text-blue-600 dark:text-blue-400" : "text-gray-600 dark:text-gray-400"
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span className="text-xs font-medium">{tab.label}</span>
                </button>
              );
            }
          })}
        </nav>
      ) : (
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
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all duration-200 text-gray-600 dark:text-gray-400"
            >
              <MoreHorizontal size={20} />
              <span className="text-xs font-medium">More</span>
            </button>
          )}
        </nav>
      )}

      {/* Mobile Group Sheet for HOD */}
      {mobileGroupOpen && role === "HOD" && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-[60] fade-in"
          onClick={() => setMobileGroupOpen(null)}
        >
          <div
            className="absolute bottom-16 left-0 right-0 rounded-t-2xl p-4 slide-up"
            style={{ background: "var(--card-bg)", maxHeight: "50vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1 rounded-full bg-gray-300 dark:bg-gray-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
              {mobileGroupOpen === "management" ? "Management" : "Reports"}
            </h3>
            <div className="space-y-1">
              {getGroupItems(mobileGroupOpen).map((item) => {
                const isActive = bestMatch === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileGroupOpen(null)}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                      isActive ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" : "hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                    style={{ color: isActive ? undefined : "var(--text-primary)" }}
                  >
                    <span>{item.icon}</span>
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Mobile More Menu */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-[60] fade-in"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="absolute bottom-16 left-0 right-0 rounded-t-2xl p-4 slide-up"
            style={{ background: "var(--card-bg)", maxHeight: "50vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1 rounded-full bg-gray-300 dark:bg-gray-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
              More Options
            </h3>
            <div className="space-y-1">
              {role === "HOD" ? (
                <>
                  {getGroupItems("more").map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                      style={{ color: "var(--text-primary)" }}
                    >
                      <span>{item.icon}</span>
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  ))}
                  <div className="flex items-center gap-3 p-3">
                    <span style={{ color: "var(--text-secondary)" }}>Theme</span>
                    <div className="ml-auto">
                      <ThemeToggle />
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      signOut({ callbackUrl: "/login" });
                    }}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all w-full text-left text-red-600 dark:text-red-400"
                  >
                    <LogOut size={20} />
                    <span className="font-medium">Logout</span>
                  </button>
                </>
              ) : (
                <>
                  {links.slice(4).map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                      style={{ color: "var(--text-primary)" }}
                    >
                      <span>{item.icon}</span>
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  ))}
                  <div className="flex items-center gap-3 p-3">
                    <span style={{ color: "var(--text-secondary)" }}>Theme</span>
                    <div className="ml-auto">
                      <ThemeToggle />
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      signOut({ callbackUrl: "/login" });
                    }}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all w-full text-left text-red-600 dark:text-red-400"
                  >
                    <LogOut size={20} />
                    <span className="font-medium">Logout</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
