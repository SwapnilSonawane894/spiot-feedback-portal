"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Building2, Users, User, Book, Clipboard } from "lucide-react";

const navItems: Array<{ href: string; label: string; icon: React.ReactNode }> = [
  { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard size={16} /> },
  { href: "/admin/departments", label: "Departments", icon: <Building2 size={16} /> },
  { href: "/admin/hod-management", label: "HOD Management", icon: <Users size={16} /> },
  { href: "/admin/staff", label: "Staff Management", icon: <User size={16} /> },
  { href: "/admin/subjects", label: "Subject Management", icon: <Book size={16} /> },
  { href: "/admin/faculty-assignment", label: "Faculty Assignment", icon: <Clipboard size={16} /> },
];

export default function DashboardSidebar(): React.ReactElement {
  const pathname = usePathname() || "/";

  return (
    <aside className="w-64 bg-white h-screen border-r border-gray-200 fixed left-0 top-0">
      <div className="p-6">
        <div className="text-xl font-bold text-gray-900">SPIOT Admin</div>
      </div>

      <nav className="mt-4 px-2 space-y-1">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
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
    </aside>
  );
}
