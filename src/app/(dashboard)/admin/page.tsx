import React from "react";
import { Building2, Users, MessageSquare, Calendar } from "lucide-react";
import prisma from "@/lib/prisma";

export default async function AdminHomePage(): Promise<React.ReactElement> {
  // Fetch real counts from the database
  const departmentCount = await prisma.department.count();
  const staffCount = await prisma.staff.count();
  const feedbackCount = await prisma.feedback.count();

  return (
    <div className="min-h-screen">
      <main className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Institute Overview</h1>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-4 rounded-lg shadow flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-md">
              <Building2 size={20} className="text-blue-700" />
            </div>
            <div>
              <div className="text-sm text-gray-500">Total Departments</div>
              <div className="text-2xl font-semibold">{departmentCount}</div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-md">
              <Users size={20} className="text-green-700" />
            </div>
            <div>
              <div className="text-sm text-gray-500">Total Staff</div>
              <div className="text-2xl font-semibold">{staffCount}</div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow flex items-center gap-4">
            <div className="p-3 bg-yellow-100 rounded-md">
              <MessageSquare size={20} className="text-yellow-700" />
            </div>
            <div>
              <div className="text-sm text-gray-500">Feedback Submitted</div>
              <div className="text-2xl font-semibold">{feedbackCount}</div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-md">
              <Calendar size={20} className="text-purple-700" />
            </div>
            <div>
              <div className="text-sm text-gray-500">Active Semester</div>
              <div className="text-2xl font-semibold">Fall 2025</div>
            </div>
          </div>
        </div>

        <section className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium mb-4">Feedback Trend</h2>
          <div className="h-64 flex items-center justify-center text-gray-400">[Chart placeholder]</div>
        </section>
      </main>
    </div>
  );
}
