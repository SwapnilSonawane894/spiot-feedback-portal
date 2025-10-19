"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Layers, Users, LogOut } from "lucide-react";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: <Home size={16} /> },
  { href: "/admin/departments", label: "Departments", icon: <Layers size={16} /> },
  { href: "/admin/hod-management", label: "HOD Management", icon: <Users size={16} /> },
  { href: "/admin/staff", label: "Staff Management", icon: <Users size={16} /> },
  { href: "/api/auth/signout", label: "Logout", icon: <LogOut size={16} /> }
];

export default function PortalSidebar() {
  const pathname = usePathname() || "/";

  return (
    <aside className="w-[250px] bg-white h-screen border-r border-gray-200 fixed left-0 top-0">
      <div className="p-6">
        <div className="text-xl font-semibold text-gray-900">SPIOT Admin</div>
      </div>

      <nav className="px-2 mt-4">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-4 py-2 rounded-md mx-2 my-1 text-sm ${active ? 'bg-blue-50 text-[#005A9C]' : 'text-gray-700 hover:bg-gray-50'}`}>
              <span className={`w-5 h-5 flex items-center ${active ? 'text-[#005A9C]' : 'text-gray-500'}`}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
