"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function HODDashboardPage(): React.ReactElement {
  const { data: session, status } = useSession();
  const router = useRouter();

  // dashboard metrics (placeholder for future use)
  const [metrics, setMetrics] = useState<any>(null);

  // student feedback submission window
  const [isFeedbackActive, setIsFeedbackActive] = useState<boolean | null>(null);
  const [loadingFeedbackToggle, setLoadingFeedbackToggle] = useState(false);

  // faculty report release status
  const [reportsReleased, setReportsReleased] = useState<boolean | null>(null);
  const [loadingReportsToggle, setLoadingReportsToggle] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) return;
    if ((session as any).user?.role !== "HOD") {
      router.replace("/");
      return;
    }

    // load all required dashboard data
    async function loadAll() {
      try {
        // metrics (non-blocking)
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
        console.error(err);
        toast.error('Failed to load dashboard data');
      }
    }

    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, status]);

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
      console.error(err);
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
      console.error(err);
      toast.error(err?.message || 'Failed to update release status');
    } finally {
      setLoadingReportsToggle(false);
    }
  }

  if (status === 'loading' || isFeedbackActive === null || reportsReleased === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="loading-spinner" style={{ width: "2rem", height: "2rem" }} />
          <p style={{ color: "var(--text-secondary)" }}>Loading dashboard...</p>
        </div>
      </div>
    );
  }
  
  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="card p-6 text-center">
          <p style={{ color: "var(--danger)" }} className="font-medium">Unauthorized Access</p>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Feedback Control Card */}
        <div className="card card-body">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title mb-0">Feedback Control</h3>
            <span className={isFeedbackActive ? "badge-success" : "badge-danger"}>
              {isFeedbackActive ? 'OPEN' : 'CLOSED'}
            </span>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>
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
        <div className="card card-body">
          <h3 className="section-title">Department Metrics</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: "var(--primary-light)" }}>
              <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Total Staff</span>
              <span className="text-lg font-bold" style={{ color: "var(--primary)" }}>-</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: "var(--success-light)" }}>
              <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Total Subjects</span>
              <span className="text-lg font-bold" style={{ color: "var(--success)" }}>-</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: "var(--secondary-light)", backgroundColor: "#f1f5f9" }}>
              <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Total Students</span>
              <span className="text-lg font-bold" style={{ color: "var(--secondary)" }}>-</span>
            </div>
          </div>
        </div>
      </div>

      {/* Faculty Reports Control Card */}
      <div className="card card-body mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="section-title mb-0">Faculty Report Control</h3>
          <span className={reportsReleased ? "badge-success" : "badge-danger"}>
            {reportsReleased ? 'RELEASED' : 'NOT RELEASED'}
          </span>
        </div>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>
              Reports Status: {reportsReleased ? 'Visible to Faculty' : 'Hidden from Faculty'}
            </p>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Release or retract final feedback reports for faculty members in your department.
            </p>
          </div>
          <div className="flex gap-3">
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

      {/* Feedback Trend Chart */}
      <div className="card">
        <div className="card-header">
          <h3 className="section-title mb-0">Feedback Analytics</h3>
        </div>
        <div className="card-body">
          <div className="h-48 rounded-lg flex items-center justify-center" style={{ background: "var(--background)" }}>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Chart visualization will appear here</p>
          </div>
        </div>
      </div>
    </>
  );
}
