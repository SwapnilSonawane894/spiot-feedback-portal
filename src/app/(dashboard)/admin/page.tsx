"use client";

import React, { useEffect, useState } from "react";
import { Building2, Users, MessageSquare, Calendar } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { ContentCard, ContentCardHeader, ContentCardBody } from "@/components/content-card";
import { SkeletonDashboardStats, SkeletonCard, SkeletonPulse } from "@/components/skeletons";

export default function AdminHomePage(): React.ReactElement {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    departmentCount: 0,
    staffCount: 0,
    feedbackCount: 0
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        const [deptRes, staffRes, feedbackRes] = await Promise.all([
          fetch('/api/departments'),
          fetch('/api/staff'),
          fetch('/api/feedback')
        ]);

        const [depts, staff, feedback] = await Promise.all([
          deptRes.json(),
          staffRes.json(),
          feedbackRes.json()
        ]);

        setStats({
          departmentCount: Array.isArray(depts) ? depts.length : 0,
          staffCount: Array.isArray(staff) ? staff.length : 0,
          feedbackCount: Array.isArray(feedback) ? feedback.length : 0
        });
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  return (
    <div>
      <PageHeader 
        title="Institute Overview" 
        description="Monitor key metrics and performance across the institution"
      />

      {loading ? (
        <>
          <SkeletonDashboardStats />
          <SkeletonCard className="section-spacing">
            <SkeletonPulse className="h-6 w-48 mb-2" />
            <SkeletonPulse className="h-4 w-64 mb-6" />
            <SkeletonPulse className="h-64 w-full rounded-lg" />
          </SkeletonCard>
        </>
      ) : (
        <>
          <div className="stats-grid section-spacing">
            <StatCard
              title="Total Departments"
              value={stats.departmentCount}
              icon={<Building2 size={24} />}
              iconBgColor="#EFF6FF"
              iconColor="#1E40AF"
            />
            <StatCard
              title="Total Staff"
              value={stats.staffCount}
              icon={<Users size={24} />}
              iconBgColor="#F0FDF4"
              iconColor="#15803D"
            />
            <StatCard
              title="Feedback Submitted"
              value={stats.feedbackCount}
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
        </>
      )}
    </div>
  );
}
