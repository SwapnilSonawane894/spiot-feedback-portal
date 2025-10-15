// src/app/(dashboard)/dashboard/page.tsx
import React from "react";
import { Building2, Users, PieChart, Calendar } from "lucide-react";

function StatCard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg shadow p-4 flex items-center gap-4">
      <div className="p-3 rounded-md bg-blue-50 text-blue-700">{icon}</div>
      <div>
        <div className="text-sm text-gray-500">{title}</div>
        <div className="text-2xl font-semibold mt-1">{value}</div>
      </div>
    </div>
  );
}

export default function DashboardPage(): React.JSX.Element {
  return (
    <div className="min-h-screen">
      <main className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Institute Overview</h1>

        {/* Summary Cards Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard title="Total Departments" value="6" icon={<Building2 size={28} />} />
          <StatCard title="Total Staff" value="48" icon={<Users size={28} />} />
          <StatCard title="Feedback Submitted" value="89%" icon={<PieChart size={28} />} />
          <StatCard title="Active Semester" value="Odd 2025-26" icon={<Calendar size={28} />} />
        </section>

        {/* Chart Section */}
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-medium mb-4">Feedback Completion by Department</h2>
          <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-md text-gray-500">
            Bar Chart will be here
          </div>
        </section>
      </main>
    </div>
  );
}