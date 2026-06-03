"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { CustomSelect } from "@/components/custom-select";
import { Users, BookOpen, TrendingUp, BarChart3, MessageSquare, Send, Download } from "lucide-react";
import { SkeletonPulse } from "@/components/skeletons";
import { DepartmentReportSection, RatingScaleLegend } from "@/components/faculty-report-preview";

const parameterGroups = {
  "Course Content & Delivery": [
    ["coverage_of_syllabus", "Coverage of Syllabus"],
    ["covering_relevant_topics_beyond_syllabus", "Beyond Syllabus Topics"],
    ["effectiveness_technical_contents", "Technical Content Effectiveness"],
    ["effectiveness_communication_skills", "Communication Skills"],
    ["effectiveness_teaching_aids", "Teaching Aids Usage"],
  ],
  "Student Development": [
    ["motivation_self_learning", "Self-Learning Motivation"],
    ["support_practical_performance", "Practical Skills Development"],
    ["support_project_seminar", "Project & Seminar Support"],
    ["feedback_on_student_progress", "Progress Feedback"],
  ],
  "Professional Conduct": [
    ["punctuality_and_discipline", "Punctuality & Discipline"],
    ["domain_knowledge", "Domain Knowledge"],
    ["interaction_with_students", "Student Interaction"],
    ["ability_to_resolve_difficulties", "Problem Resolution"],
  ],
  "Holistic Development": [
    ["encourage_cocurricular", "Co-curricular Activities"],
    ["encourage_extracurricular", "Extra-curricular Activities"],
    ["guidance_during_internship", "Internship Guidance"],
  ],
};

export default function PrincipalFeedbackReportsPage() {
  const [hods, setHods] = useState<any[]>([]);
  const [semesters, setSemesters] = useState<string[]>([]);
  const [selectedSemester, setSelectedSemester] = useState<string>("");
  const [selectedHod, setSelectedHod] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [semestersLoading, setSemestersLoading] = useState(true);

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
      toast.error("Failed to load semesters");
    } finally {
      setSemestersLoading(false);
    }
  }, []);

  const fetchHodReports = useCallback(async (semester: string) => {
    if (!semester) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/principal/hod-reports?semester=${encodeURIComponent(semester)}`);
      if (!res.ok) throw new Error("Failed to load HOD reports");
      const json = await res.json();
      setHods(json.hods || []);
    } catch {
      toast.error("Failed to load HOD reports");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSemesters();
  }, [fetchSemesters]);

  useEffect(() => {
    if (selectedSemester) {
      fetchHodReports(selectedSemester);
      setSelectedHod("");
    }
  }, [selectedSemester, fetchHodReports]);

  const handleSemesterChange = (newSemester: string) => {
    setSelectedSemester(newSemester);
    setSelectedHod("");
  };

  const hodOptions = useMemo(
    () => hods.map((h) => ({ value: h.hodStaffId, label: `${h.hodName} (${h.departmentName})` })),
    [hods]
  );

  const selectedHodData = useMemo(
    () => hods.find((h) => h.hodStaffId === selectedHod) || null,
    [hods, selectedHod]
  );

  const overallStats = useMemo(() => {
    if (!hods.length) return null;
    let totalSubjects = 0;
    let allScores: number[] = [];
    let totalResponses = 0;

    hods.forEach((h) => {
      h.reports.forEach((r: any) => {
        totalSubjects++;
        totalResponses += r.totalResponses ?? 0;
        Object.keys(r.averages || {}).forEach((key) => {
          const score = r.averages[key];
          if (score > 0) allScores.push(score);
        });
      });
    });

    const avgScore = allScores.length > 0
      ? allScores.reduce((a, b) => a + b, 0) / allScores.length
      : 0;

    return { totalHods: hods.length, totalSubjects, totalResponses, avgScore };
  }, [hods]);

  return (
    <main className="max-w-7xl mx-auto">
      <div className="page-header">
        <h1 className="page-title">HOD Feedback Analytics & Reports</h1>
        <p className="page-description">View student feedback on HOD teaching and provide suggestions</p>
      </div>

      {/* Stats Overview */}
      {overallStats && !selectedHod && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard icon={Users} label="Total HODs" value={overallStats.totalHods} color="var(--primary)" />
          <StatCard icon={BookOpen} label="Total Subjects" value={overallStats.totalSubjects} color="var(--success)" />
          <StatCard icon={TrendingUp} label="Average Score" value={`${overallStats.avgScore.toFixed(1)}/5`} color="#FFA500" />
          <StatCard icon={BarChart3} label="Total Responses" value={overallStats.totalResponses} color="#9333EA" />
        </div>
      )}

      {/* Filter Section */}
      <div className="mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <CustomSelect
            label="Semester"
            options={semesters.map((s) => ({ value: s, label: s }))}
            value={selectedSemester}
            onChange={handleSemesterChange}
            placeholder={semestersLoading ? "Loading..." : "Select semester"}
            className="w-full sm:w-48"
          />
          <CustomSelect
            label="Filter by HOD"
            options={[{ value: "", label: "All HODs" }, ...hodOptions]}
            value={selectedHod}
            onChange={setSelectedHod}
            placeholder="Select HOD"
            className="w-full sm:w-96"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="loading-spinner" style={{ width: "2.5rem", height: "2.5rem" }} />
            <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              Loading HOD reports...
            </p>
          </div>
        </div>
      ) : selectedHodData ? (
        <div>
          <HodReportView hod={selectedHodData} semester={selectedSemester} />
          <PrincipalSuggestionCard hodStaffId={selectedHod} semester={selectedSemester} />
          <HodReportPreviewContainer hodStaffId={selectedHod} semester={selectedSemester} />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {hods.length === 0 ? (
            <div className="card">
              <div className="card-body">
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  No HOD reports available for {selectedSemester || "this semester"}.
                </p>
              </div>
            </div>
          ) : (
            hods.map((h) => <HodReportView key={h.hodStaffId} hod={h} compact />)
          )}
        </div>
      )}
    </main>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: any;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="card" style={{ borderLeft: `4px solid ${color}` }}>
      <div className="card-body">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>
              {label}
            </p>
            <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
              {value}
            </p>
          </div>
          <div
            className="p-3 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${color}15` }}
          >
            <Icon size={24} style={{ color }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function HodReportView({ hod, compact = false, semester = "" }: { hod: any; compact?: boolean; semester?: string }) {
  const [expandedReports, setExpandedReports] = useState<Set<string>>(
    new Set(compact ? [] : [hod.reports[0]?.assignmentId].filter(Boolean))
  );

  const toggleExpanded = (reportId: string) => {
    setExpandedReports((prev) => {
      const next = new Set(prev);
      if (next.has(reportId)) next.delete(reportId);
      else next.add(reportId);
      return next;
    });
  };

  const getOverallScore = (report: any) => {
    const scores = Object.values(report.averages || {}) as number[];
    if (!scores.length) return 0;
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  };

  const getScoreColor = (score: number) => {
    const pct = (score / 5) * 100;
    if (pct >= 80) return "var(--success)";
    if (pct >= 60) return "var(--primary)";
    if (pct >= 40) return "#FFA500";
    return "var(--danger)";
  };

  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <div
          className="p-2 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: "var(--primary-light)" }}
        >
          <Users size={20} style={{ color: "var(--primary)" }} />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            {hod.hodName}
          </h2>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {hod.departmentName}
          </p>
        </div>
        <span className="badge badge-secondary">
          {hod.reports.length} Subject{hod.reports.length !== 1 ? "s" : ""}
        </span>
        {!compact && hod.hodStaffId && hod.departmentId && semester && (
          <a
            href={`/api/faculty/${hod.hodStaffId}/report.pdf?departmentId=${hod.departmentId}${semester ? `&semester=${encodeURIComponent(semester)}` : ""}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded text-sm transition-colors"
            style={{ backgroundColor: "var(--primary)", color: "white" }}
            download
          >
            <Download size={15} />
            Download PDF
          </a>
        )}
      </div>

      <div className="overflow-x-auto pb-4" style={{ scrollbarWidth: "thin" }}>
        <div className="flex gap-4" style={{ minWidth: "min-content" }}>
          {hod.reports.map((report: any) => {
            const overallScore = getOverallScore(report);
            const isExpanded = expandedReports.has(report.assignmentId);

            return (
              <div
                key={report.assignmentId}
                className="card flex flex-col"
                style={{
                  minWidth: isExpanded ? "500px" : "320px",
                  width: isExpanded ? "500px" : "320px",
                  height: isExpanded ? "auto" : "280px",
                }}
              >
                <div className="card-body flex-1 flex flex-col">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0 mr-3">
                      <h3
                        className="font-bold text-base mb-1 truncate"
                        style={{ color: "var(--text-primary)" }}
                        title={report.subject?.name}
                      >
                        {report.subject?.name}
                      </h3>
                      <p className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
                        {report.semester} • {report.subject?.subjectCode}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>
                        Responses
                      </div>
                      <div className="text-sm font-bold" style={{ color: "var(--primary)" }}>
                        {report.totalResponses}
                      </div>
                    </div>
                  </div>

                  <div className="mb-4 p-3 rounded-lg" style={{ background: "var(--hover-overlay)" }}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                        Overall Performance
                      </span>
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-2">
                          <div
                            className="text-2xl font-bold"
                            style={{ color: getScoreColor(overallScore) }}
                          >
                            {overallScore.toFixed(1)}
                          </div>
                          <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                            /5.0
                          </span>
                        </div>
                        <div
                          className="text-xs font-medium"
                          style={{ color: getScoreColor(overallScore) }}
                        >
                          {((overallScore / 5) * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                    <div
                      className="mt-2 w-full h-2 rounded-full"
                      style={{ background: "var(--card-border)" }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${(overallScore / 5) * 100}%`,
                          background: getScoreColor(overallScore),
                        }}
                      />
                    </div>
                  </div>

                  <div className={`flex-1 ${isExpanded ? "mb-4" : ""}`}>
                    {isExpanded && (
                      <div className="space-y-4 overflow-y-auto" style={{ maxHeight: "600px" }}>
                        {Object.entries(parameterGroups).map(([groupName, params]) => (
                          <div key={groupName}>
                            <h4
                              className="text-xs font-semibold mb-2"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              {groupName}
                            </h4>
                            <div className="space-y-2">
                              {params.map(([key, label]) => {
                                const score = report.averages?.[key] ?? 0;
                                const percentage = (score / 5) * 100;
                                return (
                                  <div key={key} className="flex items-center gap-3">
                                    <div className="flex-1 min-w-0">
                                      <div
                                        className="text-xs truncate"
                                        style={{ color: "var(--text-primary)" }}
                                      >
                                        {label}
                                      </div>
                                      <div
                                        className="w-full h-1.5 rounded-full mt-1"
                                        style={{ background: "var(--card-border)" }}
                                      >
                                        <div
                                          className="h-full rounded-full transition-all duration-300"
                                          style={{
                                            width: `${percentage}%`,
                                            background: getScoreColor(score),
                                          }}
                                        />
                                      </div>
                                    </div>
                                    <div
                                      className="text-xs font-bold shrink-0"
                                      style={{
                                        color: getScoreColor(score),
                                        minWidth: "45px",
                                        textAlign: "right",
                                      }}
                                    >
                                      {score.toFixed(1)}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => toggleExpanded(report.assignmentId)}
                    className="w-full text-center text-sm font-medium py-2 rounded-lg transition-colors mt-auto"
                    style={{ color: "var(--primary)", background: "var(--primary-light)" }}
                  >
                    {isExpanded ? "Show Less" : "View Detailed Metrics"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PrincipalSuggestionCard({
  hodStaffId,
  semester: initialSemester,
}: {
  hodStaffId: string;
  semester: string;
}) {
  const [text, setText] = useState("");
  const [hodResponse, setHodResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const semester = initialSemester;

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
        setText(json.suggestion?.content || "");
        setHodResponse(json.suggestion?.hodResponse || "");
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, [hodStaffId, semester]);

  async function save() {
    if (!hodStaffId || !semester) {
      toast.error("Please select a semester before saving.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/principal/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hodStaffId, semester, content: text }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Save failed");
      toast.success("Suggestion saved successfully");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save suggestion");
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
    <div className="card mt-6" style={{ borderLeft: "4px solid var(--primary)" }}>
      <div className="card-body">
        <div className="flex items-center gap-2 mb-4">
          <div
            className="p-2 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: "var(--primary-light)" }}
          >
            <MessageSquare size={18} style={{ color: "var(--primary)" }} />
          </div>
          <h3 className="section-title mb-0">Your Suggestion to HOD</h3>
        </div>

        <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
          Enter your suggestions or action points for this HOD (one point per line — they will be
          numbered automatically).
        </p>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter your suggestions here (one point per line)..."
          className="w-full p-3 rounded-lg border text-sm resize-none h-28"
          style={{
            backgroundColor: "var(--card-bg)",
            borderColor: "var(--card-border)",
            color: "var(--text-primary)",
          }}
        />

        <div className="flex justify-end mt-3">
          <button
            onClick={save}
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
                Save Suggestion
              </>
            )}
          </button>
        </div>

        {hodResponse && (
          <div
            className="mt-4 p-4 rounded-lg"
            style={{ backgroundColor: "var(--hover-overlay)", borderLeft: "3px solid var(--success)" }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Send size={16} style={{ color: "var(--success)" }} />
              <h4 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                HOD Response
              </h4>
            </div>
            {hodResponse.trim() ? (
              <ol className="list-decimal list-inside space-y-1">
                {hodResponse
                  .split("\n")
                  .filter((line) => line.trim())
                  .map((point, idx) => (
                    <li key={idx} className="text-sm" style={{ color: "var(--text-secondary)" }}>
                      {point.trim()}
                    </li>
                  ))}
              </ol>
            ) : (
              <p className="text-sm italic" style={{ color: "var(--text-muted)" }}>
                No response from HOD yet.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function HodReportPreviewContainer({ hodStaffId, semester }: { hodStaffId: string; semester: string }) {
  const [data, setData] = useState<any>(null);
  const [principalSuggestion, setPrincipalSuggestion] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hodStaffId || !semester) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/faculty/report?staffId=${hodStaffId}&semester=${encodeURIComponent(semester)}`).then((r) => r.json()),
      fetch(`/api/principal/suggestions?hodStaffId=${hodStaffId}&semester=${encodeURIComponent(semester)}`).then((r) => r.json()),
    ])
      .then(([reportData, suggData]) => {
        setData(reportData);
        setPrincipalSuggestion(suggData?.suggestion || null);
      })
      .catch(() => { setData(null); setPrincipalSuggestion(null); })
      .finally(() => setLoading(false));
  }, [hodStaffId, semester]);

  if (loading) {
    return (
      <div className="mt-8 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
        Loading HOD report preview...
      </div>
    );
  }

  if (!data?.departmentReports?.length) return null;

  const hasMultiple = data.departmentReports.length > 1;
  const psDeptId = data.departmentReports[0]?.departmentId || "";

  return (
    <div className="mt-8">
      <h3 className="section-title mb-4">HOD Report View & Download</h3>
      <div
        className="p-4 sm:p-6 rounded-lg border"
        style={{ borderColor: "var(--card-border)", backgroundColor: "var(--card-bg)" }}
      >
        <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
          Preview of feedback ratings for this HOD (suggestion visible to HOD is shown below).
        </p>

        {/* Download PDF button */}
        <div className="flex justify-end mb-4">
          <a
            href={`/api/faculty/${hodStaffId}/report.pdf?departmentId=${psDeptId}&semester=${encodeURIComponent(semester)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary flex items-center gap-2 text-sm px-4 py-2 rounded-lg"
            style={{ textDecoration: "none" }}
          >
            <Download size={16} />
            Download PDF
          </a>
        </div>

        {/* Principal Suggestions section */}
        <div
          className="rounded-lg p-4 mb-4 border-l-4"
          style={{ backgroundColor: "var(--hover-overlay)", borderLeftColor: "var(--primary)" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare size={16} style={{ color: "var(--primary)" }} />
            <span className="font-semibold text-sm">Principal Suggestions</span>
          </div>
          {principalSuggestion?.content ? (
            <ol className="list-none pl-0 space-y-1">
              {principalSuggestion.content
                .split("\n")
                .filter((l: string) => l.trim())
                .map((point: string, idx: number) => (
                  <li key={idx} className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    {idx + 1}. {point.trim()}
                  </li>
                ))}
            </ol>
          ) : (
            <p className="text-sm italic" style={{ color: "var(--text-muted)" }}>
              No suggestions from Principal yet.
            </p>
          )}
        </div>

        {/* HOD Response section */}
        <div
          className="rounded-lg p-4 mb-6 border-l-4"
          style={{ backgroundColor: "var(--hover-overlay)", borderLeftColor: "var(--success, #22c55e)" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Send size={16} style={{ color: "var(--success, #22c55e)" }} />
            <span className="font-semibold text-sm">HOD Response to Principal Suggestions</span>
          </div>
          {principalSuggestion?.hodResponse ? (
            <ol className="list-none pl-0 space-y-1">
              {principalSuggestion.hodResponse
                .split("\n")
                .filter((l: string) => l.trim())
                .map((point: string, idx: number) => (
                  <li key={idx} className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    {idx + 1}. {point.trim()}
                  </li>
                ))}
            </ol>
          ) : (
            <p className="text-sm italic" style={{ color: "var(--text-muted)" }}>
              No response from HOD yet.
            </p>
          )}
        </div>

        {/* Subject rating reports — hide the built-in HOD suggestion block */}
        {data.departmentReports.map((deptData: any) => (
          <DepartmentReportSection
            key={deptData.departmentId}
            deptData={deptData}
            staffId={data.staffId}
            semester={semester}
            isHomeDepartment={deptData.departmentId === data.homeDepartmentId}
            showDepartmentLabel={hasMultiple}
            isHodMode={true}
            hideSuggestion={true}
          />
        ))}
        <div className="mt-6">
          <RatingScaleLegend />
        </div>
      </div>
    </div>
  );
}
