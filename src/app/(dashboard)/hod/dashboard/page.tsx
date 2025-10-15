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

  if (status === 'loading' || isFeedbackActive === null || reportsReleased === null) return <div className="p-8">Loading...</div>;
  if (!session) return <div className="p-8">Unauthorized</div>;

  return (
    <main className="p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Department Overview</h1>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500">Feedback Control</div>
          <div className="mt-2 flex items-center justify-between">
            <div>
              <div className={`font-medium ${isFeedbackActive ? 'text-green-600' : 'text-red-600'}`}>
                Feedback Period is Currently: {isFeedbackActive ? 'OPEN' : 'CLOSED'}
              </div>
              <div className="text-sm text-gray-500 mt-1">Toggle to allow or disallow students from seeing and submitting feedback.</div>
            </div>
            <div>
              {isFeedbackActive ? (
                <button onClick={handleToggleFeedback} disabled={loadingFeedbackToggle} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50">
                  {loadingFeedbackToggle ? 'Stopping...' : 'Stop Feedback Period'}
                </button>
              ) : (
                <button onClick={handleToggleFeedback} disabled={loadingFeedbackToggle} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                  {loadingFeedbackToggle ? 'Starting...' : 'Start Feedback Period'}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500">Other Department Metrics</div>
          <div className="text-sm text-gray-500 mt-2">(Summary cards for staff/subjects, etc.)</div>
        </div>
      </div>

      {/* Faculty Reports Control Card */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="text-sm text-gray-500">Faculty Report Control</div>
        <div className="mt-2 flex items-center justify-between">
          <div>
            <div className={`font-medium ${reportsReleased ? 'text-green-600' : 'text-red-600'}`}>
              Faculty Reports are Currently: {reportsReleased ? 'RELEASED' : 'NOT RELEASED'}
            </div>
            <div className="text-sm text-gray-500 mt-1">Release or retract final feedback reports for faculty members in your department.</div>
          </div>
          <div>
            {reportsReleased ? (
              <button onClick={handleToggleReleaseStatus} disabled={loadingReportsToggle} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50">
                {loadingReportsToggle ? 'Retracting...' : 'Retract Reports from Faculty'}
              </button>
            ) : (
              <button onClick={handleToggleReleaseStatus} disabled={loadingReportsToggle} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                {loadingReportsToggle ? 'Releasing...' : 'Release Reports to Faculty'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium mb-2">Feedback Trend</h2>
        <div className="h-48 bg-gray-50 rounded-md flex items-center justify-center text-gray-400">Chart placeholder</div>
      </div>
    </main>
  );
}
