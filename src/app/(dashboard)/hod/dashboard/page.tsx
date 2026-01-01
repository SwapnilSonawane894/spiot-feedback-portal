"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Users, BookOpen, GraduationCap } from "lucide-react";
import { SkeletonCard, SkeletonPulse, SkeletonMetricRow } from "@/components/skeletons";

function HODDashboardSkeleton() {
  return (
    <>
      <div className="page-header">
        <SkeletonPulse className="h-8 w-64 mb-2" />
        <SkeletonPulse className="h-4 w-96" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6 mb-6">
        <SkeletonCard className="hover-lift">
          <div className="flex items-center justify-between mb-5">
            <SkeletonPulse className="h-6 w-40" />
            <SkeletonPulse className="h-6 w-16 rounded-full" />
          </div>
          <div className="space-y-4">
            <SkeletonPulse className="h-4 w-full" />
            <SkeletonPulse className="h-4 w-3/4" />
            <SkeletonPulse className="h-10 w-full rounded-lg" />
          </div>
        </SkeletonCard>

        <SkeletonCard className="hover-lift">
          <SkeletonPulse className="h-6 w-40 mb-5" />
          <div className="space-y-3">
            <SkeletonMetricRow />
            <SkeletonMetricRow />
            <SkeletonMetricRow />
          </div>
        </SkeletonCard>
      </div>

      <SkeletonCard className="mb-6 hover-lift">
        <div className="flex items-center justify-between mb-5">
          <SkeletonPulse className="h-6 w-48" />
          <SkeletonPulse className="h-6 w-24 rounded-full" />
        </div>
        <div className="space-y-4">
          <SkeletonPulse className="h-4 w-full" />
          <SkeletonPulse className="h-4 w-3/4" />
          <SkeletonPulse className="h-10 w-48 rounded-lg" />
        </div>
      </SkeletonCard>

      <SkeletonCard className="hover-lift">
        <SkeletonPulse className="h-6 w-40 mb-2" />
        <SkeletonPulse className="h-4 w-64 mb-6" />
        <SkeletonPulse className="h-64 w-full rounded-xl" />
      </SkeletonCard>
    </>
  );
}

export default function HODDashboardPage(): React.ReactElement {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [metrics, setMetrics] = useState<any>(null);
  const [isFeedbackActive, setIsFeedbackActive] = useState<boolean | null>(null);
  const [loadingFeedbackToggle, setLoadingFeedbackToggle] = useState(false);
  const [reportsReleased, setReportsReleased] = useState<boolean | null>(null);
  const [loadingReportsToggle, setLoadingReportsToggle] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) return;
    if ((session as any).user?.role !== "HOD") {
      router.replace("/");
      return;
    }

    async function loadAll() {
      try {
        (async () => {
          try {
            const r = await fetch('/api/hod/metrics');
            if (r.ok) {
              const j = await r.json();
              setMetrics(j);
            }
          } catch (e) {
            // ignore metrics failure
          }
        })();

        const resStatus = await fetch('/api/hod/feedback-status');
        if (resStatus.ok) {
          const json = await resStatus.json();
          setIsFeedbackActive(Boolean(json.isFeedbackActive));
        }

        const resRelease = await fetch('/api/hod/release-status');
        if (resRelease.ok) {
          const json = await resRelease.json();
          setReportsReleased(Boolean(json.isReleased));
        }
      } catch (err: any) {
        // console.error(err);
        toast.error('Failed to load dashboard data');
      }
    }

    loadAll();
  }, [session, status, router]);

  async function handleToggleFeedback() {
    if (isFeedbackActive === null) return;
    setLoadingFeedbackToggle(true);
    try {
      const res = await fetch('/api/hod/feedback-status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isFeedbackActive }),
      });
      if (!res.ok) throw new Error('Failed to update feedback status');
      const json = await res.json();
      setIsFeedbackActive(Boolean(json.isFeedbackActive));
      toast.success(`Feedback window ${json.isFeedbackActive ? 'opened' : 'closed'}`);
    } catch (err: any) {
      // console.error(err);
      toast.error(err?.message || 'Failed to update feedback status');
    } finally {
      setLoadingFeedbackToggle(false);
    }
  }

  async function handleToggleReleaseStatus() {
    if (reportsReleased === null) return;
    setLoadingReportsToggle(true);
    try {
      const res = await fetch('/api/hod/release-status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shouldBeReleased: !reportsReleased }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || 'Failed to update release status');
      }
      const json = await res.json();
      setReportsReleased(Boolean(json.isReleased));
      toast.success(json.isReleased ? 'Reports released to faculty' : 'Reports retracted from faculty');
    } catch (err: any) {
      // console.error(err);
      toast.error(err?.message || 'Failed to update release status');
    } finally {
      setLoadingReportsToggle(false);
    }
  }

  if (status === 'loading' || isFeedbackActive === null || reportsReleased === null) {
    return <HODDashboardSkeleton />;
  }
  
  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="card p-8 text-center">
          <p style={{ color: "var(--danger)" }} className="font-semibold text-lg">Unauthorized Access</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Department Overview</h1>
        <p className="page-description">Manage feedback collection and view department analytics</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6 mb-6">
        {/* Feedback Control Card */}
        <div className="card card-body hover-lift">
          <div className="flex items-center justify-between mb-5">
            <h3 className="section-title mb-0">Feedback Control</h3>
            <span className={`badge ${isFeedbackActive ? "badge-success" : "badge-danger"}`}>
              {isFeedbackActive ? 'OPEN' : 'CLOSED'}
            </span>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
                Feedback Period: {isFeedbackActive ? 'Currently Open' : 'Currently Closed'}
              </p>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                Toggle to allow or restrict students from submitting feedback.
              </p>
            </div>
            <div>
              {isFeedbackActive ? (
                <button onClick={handleToggleFeedback} disabled={loadingFeedbackToggle} className="btn-danger w-full">
                  {loadingFeedbackToggle ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="loading-spinner" />
                      Closing...
                    </span>
                  ) : 'Stop Feedback Period'}
                </button>
              ) : (
                <button onClick={handleToggleFeedback} disabled={loadingFeedbackToggle} className="btn-primary w-full">
                  {loadingFeedbackToggle ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="loading-spinner" />
                      Opening...
                    </span>
                  ) : 'Start Feedback Period'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Department Metrics Card */}
        <div className="card card-body hover-lift">
          <h3 className="section-title mb-5">Department Metrics</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 rounded-xl transition-all hover-scale" style={{ background: "var(--primary-light)" }}>
              <div className="flex items-center gap-3">
                <Users size={20} style={{ color: "var(--primary)" }} />
                <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Total Staff</span>
              </div>
              <span className="text-xl font-bold" style={{ color: "var(--primary)" }}>{metrics?.staffCount || 0}</span>
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl transition-all hover-scale" style={{ background: "var(--success-light)" }}>
              <div className="flex items-center gap-3">
                <BookOpen size={20} style={{ color: "var(--success)" }} />
                <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Total Subjects</span>
              </div>
              <span className="text-xl font-bold" style={{ color: "var(--success)" }}>{metrics?.subjectCount || 0}</span>
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl transition-all hover-scale" style={{ background: "var(--hover-overlay)" }}>
              <div className="flex items-center gap-3">
                <GraduationCap size={20} style={{ color: "var(--text-secondary)" }} />
                <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Total Students</span>
              </div>
              <span className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{metrics?.studentCount || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Faculty Reports Control Card */}
      <div className="card card-body mb-6 hover-lift">
        <div className="flex items-center justify-between mb-5">
          <h3 className="section-title mb-0">Faculty Report Control</h3>
          <span className={`badge ${reportsReleased ? "badge-success" : "badge-danger"}`}>
            {reportsReleased ? 'RELEASED' : 'NOT RELEASED'}
          </span>
        </div>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
              Reports Status: {reportsReleased ? 'Visible to Faculty' : 'Hidden from Faculty'}
            </p>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Release or retract final feedback reports for faculty members in your department.
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            {reportsReleased ? (
              <button onClick={handleToggleReleaseStatus} disabled={loadingReportsToggle} className="btn-danger">
                {loadingReportsToggle ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="loading-spinner" />
                    Retracting...
                  </span>
                ) : 'Retract Reports from Faculty'}
              </button>
            ) : (
              <button onClick={handleToggleReleaseStatus} disabled={loadingReportsToggle} className="btn-success">
                {loadingReportsToggle ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="loading-spinner" />
                    Releasing...
                  </span>
                ) : 'Release Reports to Faculty'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Feedback Analytics Chart */}
      <div className="card hover-lift">
        <div className="card-header">
          <h3 className="section-title mb-0">Feedback Analytics</h3>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Visual representation of feedback trends</p>
        </div>
        <div className="card-body">
          <div className="h-64 rounded-xl flex items-center justify-center" style={{ background: "var(--background)" }}>
            <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>Chart visualization will appear here</p>
          </div>
        </div>
      </div>
    </>
  );
}
