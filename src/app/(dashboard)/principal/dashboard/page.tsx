"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Users, Building2, GraduationCap } from "lucide-react";
import { SkeletonCard, SkeletonPulse, SkeletonMetricRow } from "@/components/skeletons";

function PrincipalDashboardSkeleton() {
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
    </>
  );
}

export default function PrincipalDashboardPage(): React.ReactElement {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [hodReportsReleased, setHodReportsReleased] = useState<boolean | null>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [loadingToggle, setLoadingToggle] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) return;
    if ((session as any).user?.role !== "PRINCIPAL") {
      router.replace("/");
      return;
    }

    async function loadData() {
      try {
        const [releaseRes, metricsRes] = await Promise.all([
          fetch("/api/principal/release-status"),
          fetch("/api/principal/metrics"),
        ]);
        if (releaseRes.ok) {
          const json = await releaseRes.json();
          setHodReportsReleased(Boolean(json.isReleased));
        }
        if (metricsRes.ok) {
          const json = await metricsRes.json();
          setMetrics(json);
        } else {
          setMetrics({});
        }
      } catch {
        toast.error("Failed to load dashboard data");
        setMetrics({});
      }
    }

    loadData();
  }, [session, status, router]);

  async function handleToggleReleaseStatus() {
    if (hodReportsReleased === null) return;
    setLoadingToggle(true);
    try {
      const res = await fetch("/api/principal/release-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shouldBeReleased: !hodReportsReleased }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Failed to update release status");
      }
      const json = await res.json();
      setHodReportsReleased(Boolean(json.isReleased));
      toast.success(
        json.isReleased
          ? "HOD reports released successfully"
          : "HOD reports retracted successfully"
      );
    } catch (err: any) {
      toast.error(err?.message || "Failed to update release status");
    } finally {
      setLoadingToggle(false);
    }
  }

  if (status === "loading" || hodReportsReleased === null || metrics === null) {
    return <PrincipalDashboardSkeleton />;
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="card p-8 text-center">
          <p style={{ color: "var(--danger)" }} className="font-semibold text-lg">
            Unauthorized Access
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Department Overview</h1>
        <p className="page-description">
          Manage HOD report visibility and oversee department performance
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6 mb-6">
        {/* HOD Report Control Card */}
        <div className="card card-body hover-lift">
          <div className="flex items-center justify-between mb-5">
            <h3 className="section-title mb-0">HOD Report Control</h3>
            <span className={`badge ${hodReportsReleased ? "badge-success" : "badge-danger"}`}>
              {hodReportsReleased ? "RELEASED" : "NOT RELEASED"}
            </span>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
                Reports Status:{" "}
                {hodReportsReleased ? "Visible to HODs" : "Hidden from HODs"}
              </p>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                Release or retract HOD self-report visibility. When released, HODs can view their
                own feedback report and your suggestions in their dashboard.
              </p>
            </div>
            <div className="flex gap-3 flex-wrap">
              {hodReportsReleased ? (
                <button
                  onClick={handleToggleReleaseStatus}
                  disabled={loadingToggle}
                  className="btn-danger"
                >
                  {loadingToggle ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="loading-spinner" />
                      Retracting...
                    </span>
                  ) : "Retract Reports from HODs"}
                </button>
              ) : (
                <button
                  onClick={handleToggleReleaseStatus}
                  disabled={loadingToggle}
                  className="btn-success"
                >
                  {loadingToggle ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="loading-spinner" />
                      Releasing...
                    </span>
                  ) : "Release Reports to HODs"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Institute Metrics Card */}
        <div className="card card-body hover-lift">
          <h3 className="section-title mb-5">Institute Metrics</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 rounded-xl transition-all hover-scale" style={{ background: "var(--primary-light)" }}>
              <div className="flex items-center gap-3">
                <Users size={20} style={{ color: "var(--primary)" }} />
                <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Total HODs</span>
              </div>
              <span className="text-xl font-bold" style={{ color: "var(--primary)" }}>{metrics?.hodCount ?? 0}</span>
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl transition-all hover-scale" style={{ background: "var(--success-light)" }}>
              <div className="flex items-center gap-3">
                <Building2 size={20} style={{ color: "var(--success)" }} />
                <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Departments</span>
              </div>
              <span className="text-xl font-bold" style={{ color: "var(--success)" }}>{metrics?.departmentCount ?? 0}</span>
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl transition-all hover-scale" style={{ background: "var(--hover-overlay)" }}>
              <div className="flex items-center gap-3">
                <GraduationCap size={20} style={{ color: "var(--text-secondary)" }} />
                <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Total Staff</span>
              </div>
              <span className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{metrics?.staffCount ?? 0}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
