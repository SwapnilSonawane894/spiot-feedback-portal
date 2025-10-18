import React from "react";
import { Building2, Users, MessageSquare, Calendar } from "lucide-react";
import prisma from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { ContentCard, ContentCardHeader, ContentCardBody } from "@/components/content-card";

export default async function AdminHomePage(): Promise<React.ReactElement> {
  // Fetch real counts from the database
  const departmentCount = await prisma.department.count();
  const staffCount = await prisma.staff.count();
  const feedbackCount = await prisma.feedback.count();

  return (
    <div>
      <PageHeader 
        title="Institute Overview" 
        description="Monitor key metrics and performance across the institution"
      />

      <div className="stats-grid section-spacing">
        <StatCard
          title="Total Departments"
          value={departmentCount}
          icon={<Building2 size={24} />}
          iconBgColor="#EFF6FF"
          iconColor="#1E40AF"
        />
        <StatCard
          title="Total Staff"
          value={staffCount}
          icon={<Users size={24} />}
          iconBgColor="#F0FDF4"
          iconColor="#15803D"
        />
        <StatCard
          title="Feedback Submitted"
          value={feedbackCount}
          icon={<MessageSquare size={24} />}
          iconBgColor="#FEF3C7"
          iconColor="#B45309"
        />
        <StatCard
          title="Active Semester"
          value="Fall 2025"
          icon={<Calendar size={24} />}
          iconBgColor="#F3E8FF"
          iconColor="#7C3AED"
        />
      </div>

      <ContentCard>
        <ContentCardHeader title="Feedback Trend" description="Overview of feedback submissions over time" />
        <ContentCardBody>
          <div className="h-64 flex items-center justify-center" style={{ color: "var(--text-muted)" }}>
            [Chart placeholder]
          </div>
        </ContentCardBody>
      </ContentCard>
    </div>
  );
}
