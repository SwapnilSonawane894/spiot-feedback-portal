"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Users,
  User,
  Book,
  Clipboard,
} from "lucide-react";

type SidebarLinkProps = {
  icon: React.ReactNode;
  text: string;
  href: string;
  active?: boolean;
};

function SidebarLink({ icon, text, href, active }: SidebarLinkProps) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-2 rounded-md text-sm transition-colors ${
        active ? "bg-blue-100 text-blue-700" : "text-gray-700 hover:bg-gray-50"
      }`}
    >
      <span className="w-5 h-5 flex items-center justify-center text-gray-600">{icon}</span>
      <span>{text}</span>
    </Link>
  );
}

function Sidebar() {
  const pathname = usePathname() || "/";

  const items: Array<{ href: string; text: string; icon: React.ReactNode }> = [
    { href: "/admin", text: "Dashboard", icon: <LayoutDashboard size={16} /> },
    { href: "/admin/departments", text: "Departments", icon: <Building2 size={16} /> },
    { href: "/admin/hod-management", text: "HOD Management", icon: <Users size={16} /> },
  { href: "/admin/staff", text: "Staff Management", icon: <User size={16} /> },
    { href: "/admin/subjects", text: "Subject Management", icon: <Book size={16} /> },
  { href: "/admin/faculty-assignment", text: "Faculty Assignment", icon: <Clipboard size={16} /> },
  ];

  return (
    <aside className="w-64 bg-white h-screen border-r border-gray-200 fixed left-0 top-0">
      <div className="p-6">
        <div className="text-xl font-bold text-gray-900">SPIOT Admin</div>
      </div>

      <nav className="mt-4 px-2 space-y-1">
        {items.map((it) => {
          const active = pathname === it.href || pathname.startsWith(it.href + "/");
          return (
            <SidebarLink key={it.href} href={it.href} text={it.text} icon={it.icon} active={active} />
          );
        })}
      </nav>
    </aside>
  );
}

type DashboardLayoutProps = {
  children: React.ReactNode;
};

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen flex bg-white">
      <Sidebar />

      <div className="flex-1 ml-64 bg-gray-100 p-8">
        <main className="max-w-7xl mx-auto">{children}</main>
      </div>
    </div>
  );
}
