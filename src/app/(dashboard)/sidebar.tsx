"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { LayoutDashboard, Building2, Users, User, Book, Clipboard, LogOut, ClipboardList, GraduationCap, School } from "lucide-react";

const adminLinks: Array<{ href: string; label: string; icon: React.ReactNode }> = [
  { href: "/admin", label: "Dashboard", icon: <LayoutDashboard size={16} /> },
  { href: "/admin/departments", label: "Departments", icon: <Building2 size={16} /> },
  { href: "/admin/years", label: "Academic Years", icon: <GraduationCap size={16} /> },
  { href: "/admin/hods", label: "HOD Management", icon: <Users size={16} /> },
  { href: "/profile", label: "My Profile", icon: <User size={16} /> },
];

const hodLinks: Array<{ href: string; label: string; icon: React.ReactNode }> = [
  { href: "/hod/dashboard", label: "Dashboard", icon: <LayoutDashboard size={16} /> },
  { href: "/hod/staff", label: "Staff Management", icon: <User size={16} /> },
  { href: "/hod/subjects", label: "Subject Management", icon: <Book size={16} /> },
    { href: "/hod/assignment", label: "Faculty Assignment", icon: <ClipboardList size={16} /> },
    { href: "/hod/students", label: "Student Management", icon: <School size={16} /> },
    { href: "/hod/reports", label: "Feedback Reports", icon: <Clipboard size={16} /> },
    { href: "/hod/submission-status", label: "Submission Status", icon: <ClipboardList size={16} /> },
    { href: "/profile", label: "My Profile", icon: <User size={16} /> },
];

const studentLinks: Array<{ href: string; label: string; icon: React.ReactNode }> = [
  { href: "/student/dashboard", label: "Dashboard", icon: <LayoutDashboard size={16} /> },
  { href: "/profile", label: "My Profile", icon: <User size={16} /> },
];

const staffLinks: Array<{ href: string; label: string; icon: React.ReactNode }> = [
  { href: "/faculty/report", label: "Dashboard", icon: <LayoutDashboard size={16} /> },
  { href: "/profile", label: "My Profile", icon: <User size={16} /> },
];

export default function Sidebar({ isOpen, onClose }: { isOpen?: boolean; onClose?: () => void }): React.ReactElement {
  const pathname = usePathname() || "/";
  const { data: session } = useSession();
  const role = (session as any)?.user?.role;
  const userName = (session as any)?.user?.name;

  const links = role === "HOD" ? hodLinks : role === "STUDENT" ? studentLinks : role === "STAFF" ? staffLinks : adminLinks;

  // choose the best (longest) matching href so nested routes highlight the specific link
  const bestMatch = links.reduce<string | null>((best, l) => {
    if (!l.href) return best;
    if (pathname === l.href || pathname.startsWith(l.href)) {
      if (!best) return l.href;
      return l.href.length > best.length ? l.href : best;
    }
    return best;
  }, null);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:block w-64 bg-white h-screen border-r border-gray-200 fixed left-0 top-0">
        <div className="p-6">
          <div className="text-xl font-bold text-gray-900">{userName || (role === "HOD" ? "SPIOT HOD" : role === "STUDENT" ? "SPIOT Student" : "SPIOT Admin")}</div>
        </div>

        <nav className="mt-4 px-2 space-y-1">
          {links.map((item) => {
            // active when this item's href is the best matching href (longest match)
            const isActive = !!bestMatch && item.href === bestMatch;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2 rounded-md text-sm mx-2 ${isActive ? "bg-blue-100 text-blue-700" : "text-gray-700 hover:bg-gray-50"}`}
              >
                <span className={`w-5 h-5 flex items-center ${isActive ? "text-blue-700" : "text-gray-500"}`}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-6 left-0 w-full px-6">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full flex items-center gap-3 px-4 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-50"
            aria-label="Logout"
          >
            <span className="w-5 h-5 flex items-center text-gray-500">
              <LogOut size={16} />
            </span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile overlay sidebar */}
      <div className={`fixed inset-0 z-50 md:hidden ${isOpen ? "" : "pointer-events-none"}`} aria-hidden={!isOpen}>
        <div className={`fixed inset-0 bg-black/40 transition-opacity ${isOpen ? "opacity-100" : "opacity-0"}`} onClick={onClose} />

        <aside className={`fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 transform transition-transform ${isOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="p-6">
            <div className="text-xl font-bold text-gray-900">{userName || (role === "HOD" ? "SPIOT HOD" : role === "STUDENT" ? "SPIOT Student" : "SPIOT Admin")}</div>
          </div>

          <nav className="mt-4 px-2 space-y-1">
            {links.map((item) => {
              const active = !!bestMatch && item.href === bestMatch;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-4 py-2 rounded-md text-sm mx-2 ${
                    active ? "bg-blue-100 text-blue-700" : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <span className={`w-5 h-5 flex items-center ${active ? "text-blue-700" : "text-gray-500"}`}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="absolute bottom-6 left-0 w-full px-6">
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full flex items-center gap-3 px-4 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-50"
              aria-label="Logout"
            >
              <span className="w-5 h-5 flex items-center text-gray-500">
                <LogOut size={16} />
              </span>
              <span>Logout</span>
            </button>
          </div>
        </aside>
      </div>
    </>
  );
}
