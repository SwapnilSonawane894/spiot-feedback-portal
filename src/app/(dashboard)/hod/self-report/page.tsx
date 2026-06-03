"use client";

import React, { useCallback, useEffect, useState } from "react";
import { SkeletonPulse, SkeletonReportCard } from "@/components/skeletons";
import { MessageSquare, Send, Lock } from "lucide-react";
import { CustomSelect } from "@/components/custom-select";
import toast from "react-hot-toast";
import { DepartmentReportSection, RatingScaleLegend } from "@/components/faculty-report-preview";

function PrincipalSuggestionCard({
  hodStaffId,
  semester,
  onResponseSaved,
}: {
  hodStaffId: string;
  semester: string;
  onResponseSaved?: () => void;
}) {
  const [suggestion, setSuggestion] = useState<string>("");
  const [hodResponse, setHodResponse] = useState<string>("");
  const [suggestionId, setSuggestionId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!hodStaffId || !semester) return;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(
          `/api/principal/suggestions?hodStaffId=${hodStaffId}&semester=${encodeURIComponent(semester)}`
        );
        if (!res.ok) return;
        const json = await res.json();
        setSuggestion(json.suggestion?.content || "");
        setHodResponse(json.suggestion?.hodResponse || "");
        setSuggestionId(json.suggestion?.id || "");
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, [hodStaffId, semester]);

  async function saveResponse() {
    if (!semester) {
      toast.error("Please select a semester first.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/hod/principal-response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ semester, hodResponse }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Save failed");
      toast.success("Response saved successfully");
      onResponseSaved?.();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save response");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="card mt-6">
        <div className="card-body">
          <SkeletonPulse className="h-6 w-48 mb-3" />
          <SkeletonPulse className="h-24 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="card mt-6">
      {/* Principal Suggestion Section */}
      <div className="card-body">
        <div
          className="mb-6 p-4 rounded-lg"
          style={{ backgroundColor: "var(--hover-overlay)", borderLeft: "4px solid var(--primary)" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare size={18} style={{ color: "var(--primary)" }} />
            <h3 className="font-medium" style={{ color: "var(--text-primary)" }}>
              Principal Suggestions
            </h3>
          </div>
          {suggestion ? (
            <ol className="list-decimal list-inside space-y-1">
              {suggestion
                .split("\n")
                .filter((line) => line.trim())
                .map((point, idx) => (
                  <li key={idx} className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    {point.trim()}
                  </li>
                ))}
            </ol>
          ) : (
            <div className="text-sm italic" style={{ color: "var(--text-muted)" }}>
              No suggestion from Principal yet.
            </div>
          )}
        </div>

        {/* HOD Response Section */}
        <div
          className="p-4 rounded-lg"
          style={{ backgroundColor: "var(--hover-overlay)", borderLeft: "4px solid var(--success)" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Send size={18} style={{ color: "var(--success)" }} />
            <h3 className="font-medium" style={{ color: "var(--text-primary)" }}>
              Your Response to Principal Suggestions
            </h3>
          </div>
          <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
            Clarify your comments or action plan based on the Principal suggestions above. Enter each
            point on a new line — they will be automatically numbered.
          </p>

          <textarea
            value={hodResponse}
            onChange={(e) => setHodResponse(e.target.value)}
            placeholder={
              suggestion
                ? "Enter your response (one point per line)..."
                : "No Principal suggestion to respond to yet."
            }
            disabled={!suggestion}
            className="w-full p-3 rounded-lg border text-sm resize-none h-24"
            style={{
              backgroundColor: suggestion ? "var(--card-bg)" : "var(--hover-overlay)",
              borderColor: "var(--card-border)",
              color: "var(--text-primary)",
            }}
          />

          {suggestion && (
            <div className="flex justify-end mt-3">
              <button
                onClick={saveResponse}
                disabled={saving}
                className="btn-primary flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <span className="loading-spinner" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    Save Response
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function HodSelfReportPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [semesters, setSemesters] = useState<string[]>([]);
  const [selectedSemester, setSelectedSemester] = useState<string>("");
  const [semestersLoading, setSemestersLoading] = useState(true);
  const [isReleased, setIsReleased] = useState<boolean | null>(null);
  const [releaseLoading, setReleaseLoading] = useState(true);
  const [hodStaffId, setHodStaffId] = useState<string>("");

  const fetchSemesters = useCallback(async () => {
    setSemestersLoading(true);
    try {
      const res = await fetch("/api/semesters");
      if (!res.ok) throw new Error("Failed to load semesters");
      const json = await res.json();
      setSemesters(json.semesters || []);
      if (json.currentSemester) {
        setSelectedSemester(json.currentSemester);
      } else if (json.semesters && json.semesters.length > 0) {
        setSelectedSemester(json.semesters[0]);
      }
    } catch {
      // ignore
    } finally {
      setSemestersLoading(false);
    }
  }, []);

  const fetchReleaseStatus = useCallback(async () => {
    setReleaseLoading(true);
    try {
      const res = await fetch("/api/principal/release-status");
      if (!res.ok) throw new Error("Failed to load release status");
      const json = await res.json();
      setIsReleased(Boolean(json.isReleased));
    } catch {
      setIsReleased(false);
    } finally {
      setReleaseLoading(false);
    }
  }, []);

  const fetchData = useCallback(async (semester: string) => {
    if (!semester) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/faculty/report?semester=${encodeURIComponent(semester)}`);
      if (!res.ok) throw new Error("Failed to load report");
      const json = await res.json();
      setData(json);
      if (json.staffId) setHodStaffId(json.staffId);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSemesters();
    fetchReleaseStatus();
  }, [fetchSemesters, fetchReleaseStatus]);

  useEffect(() => {
    if (selectedSemester && isReleased) {
      fetchData(selectedSemester);
    } else if (selectedSemester && isReleased === false) {
      setLoading(false);
    }
  }, [selectedSemester, isReleased, fetchData]);

  if (semestersLoading || releaseLoading) {
    return (
      <main className="max-w-7xl mx-auto">
        <div className="text-left mb-6">
          <SkeletonPulse className="h-9 w-96 mb-2" />
          <SkeletonPulse className="h-5 w-64" />
        </div>
        <SkeletonReportCard />
      </main>
    );
  }

  if (!isReleased) {
    return (
      <main className="max-w-7xl mx-auto">
        <div className="text-left mb-6">
          <h1 className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
            My Report
          </h1>
        </div>

        <div className="card">
          <div className="card-body flex flex-col items-center justify-center py-16 gap-4 text-center">
            <div
              className="p-4 rounded-full"
              style={{ backgroundColor: "var(--hover-overlay)" }}
            >
              <Lock size={32} style={{ color: "var(--text-muted)" }} />
            </div>
            <h2 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
              Report Not Yet Available
            </h2>
            <p className="text-sm max-w-md" style={{ color: "var(--text-secondary)" }}>
              Your feedback report has not been released by the Principal yet. Please check back
              later or contact your Principal for more information.
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="max-w-7xl mx-auto">
        <div className="text-left mb-6">
          <SkeletonPulse className="h-9 w-96 mb-2" />
          <SkeletonPulse className="h-5 w-64" />
        </div>
        <div className="flex justify-end mb-4">
          <SkeletonPulse className="h-10 w-40 rounded" />
        </div>
        <SkeletonReportCard />
      </main>
    );
  }

  const departmentReports = data?.departmentReports || [];
  const hasMultipleDepartments = departmentReports.length > 1;

  return (
    <main className="max-w-7xl mx-auto">
      <div className="text-left mb-6">
        <h1 className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
          My Report
        </h1>
        {hasMultipleDepartments && (
          <p className="text-sm mt-2" style={{ color: "var(--text-secondary)" }}>
            You have feedback reports from {departmentReports.length} departments
          </p>
        )}
      </div>

      {/* Semester Filter */}
      <div className="mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <CustomSelect
            label="Semester"
            options={semesters.map((s) => ({ value: s, label: s }))}
            value={selectedSemester}
            onChange={setSelectedSemester}
            placeholder={semestersLoading ? "Loading..." : "Select semester"}
            className="w-full sm:w-64"
          />
        </div>
      </div>

      {/* Principal Suggestion — shown ONCE at the top before subject reports */}
      {hodStaffId && selectedSemester && (
        <PrincipalSuggestionCard
          hodStaffId={hodStaffId}
          semester={selectedSemester}
          onResponseSaved={() => fetchData(selectedSemester)}
        />
      )}

      {(!departmentReports || departmentReports.length === 0) && (
        <div className="card mt-4">
          <div className="card-body">
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              No report data available for {selectedSemester || "this semester"}.
            </p>
          </div>
        </div>
      )}

      <div className="mt-6">
        {departmentReports.map((deptData: any) => (
          <DepartmentReportSection
            key={deptData.departmentId}
            deptData={deptData}
            staffId={data?.staffId}
            semester={selectedSemester}
            isHomeDepartment={deptData.departmentId === data?.homeDepartmentId}
            showDepartmentLabel={hasMultipleDepartments}
            onResponseSaved={() => fetchData(selectedSemester)}
            hideSuggestion={true}
          />
        ))}
      </div>

      <RatingScaleLegend />
    </main>
  );
}
