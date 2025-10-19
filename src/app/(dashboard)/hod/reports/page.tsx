"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui-controls";
import { CustomSelect } from "@/components/custom-select";
import { Download, TrendingUp, Users, BookOpen, BarChart3 } from "lucide-react";

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

export default function HodReportsPage() {
  const [data, setData] = useState<any[]>([]);
  const [years, setYears] = useState<any[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedStaff, setSelectedStaff] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hod/reports");
      if (!res.ok) throw new Error("Failed to load reports");
      const json = await res.json();
      setData(json.reports || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchYears = useCallback(async () => {
    try {
      const res = await fetch('/api/years');
      if (!res.ok) throw new Error('Failed to load years');
      const json = await res.json();
      setYears(json || []);
      if (json && json.length > 0) setSelectedYear(json[0].id);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load academic years');
    }
  }, []);

  useEffect(() => {
    fetchReports();
    fetchYears();
  }, [fetchReports, fetchYears]);

  const handleDownloadReport = useCallback(() => {
    if (!selectedYear) {
      toast.error('Select a year');
      return;
    }
    window.location.href = `/api/hod/comparative-report?year=${selectedYear}`;
  }, [selectedYear]);

  const staffOptions = useMemo(() => data.map((d) => ({ id: d.staffId, name: d.staffName })), [data]);
  const selected = useMemo(() => data.find((d) => d.staffId === selectedStaff) || null, [data, selectedStaff]);
  
  const overallStats = useMemo(() => {
    if (!data.length) return null;
    
    let totalResponses = 0;
    let totalStudents = 0;
    let totalSubjects = 0;
    let allScores: number[] = [];

    data.forEach(staff => {
      staff.reports.forEach((r: any) => {
        totalResponses += r.submissionCount ?? r.totalResponses ?? 0;
        totalStudents += r.totalStudents ?? 0;
        totalSubjects++;
        
        Object.keys(r.averages || {}).forEach(key => {
          const score = r.averages[key];
          if (score > 0) allScores.push(score);
        });
      });
    });

    const avgScore = allScores.length > 0 
      ? allScores.reduce((a, b) => a + b, 0) / allScores.length 
      : 0;
    
    const responseRate = totalStudents > 0 
      ? (totalResponses / totalStudents) * 100 
      : 0;

    return {
      totalFaculty: data.length,
      totalSubjects,
      totalResponses,
      totalStudents,
      avgScore,
      responseRate
    };
  }, [data]);

  return (
    <main className="max-w-7xl mx-auto">
      <div className="page-header">
        <h1 className="page-title">Feedback Analytics & Reports</h1>
        <p className="page-description">Comprehensive faculty performance insights</p>
      </div>

      {/* Stats Overview */}
      {overallStats && !selectedStaff && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            icon={Users}
            label="Faculty Members"
            value={overallStats.totalFaculty}
            color="var(--primary)"
          />
          <StatCard
            icon={BookOpen}
            label="Total Subjects"
            value={overallStats.totalSubjects}
            color="var(--success)"
          />
          <StatCard
            icon={TrendingUp}
            label="Average Score"
            value={`${overallStats.avgScore.toFixed(1)}/5`}
            color="#FFA500"
          />
          <StatCard
            icon={BarChart3}
            label="Response Rate"
            value={`${overallStats.responseRate.toFixed(0)}%`}
            color="#9333EA"
          />
        </div>
      )}

      {/* Download Report Section */}
      <div className="card mb-6" style={{ background: "linear-gradient(135deg, var(--primary-light) 0%, var(--card-bg) 100%)" }}>
        <div className="card-body">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-lg font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                Generate Comparative Report
              </h2>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                Download comprehensive Excel report for selected academic year
              </p>
            </div>
            <div className="flex items-end gap-3 flex-wrap">
              <CustomSelect
                label="Academic Year"
                options={years.map((y) => ({ value: y.id, label: y.name }))}
                value={selectedYear}
                onChange={setSelectedYear}
                placeholder="Select year"
                className="w-64"
              />
              <Button onClick={handleDownloadReport} className="gap-2">
                <Download size={16} />
                Download Report
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Section */}
      <div className="mb-6">
        <CustomSelect
          label="Filter by Faculty Member"
          options={[
            { value: "", label: "All Faculty Members" },
            ...staffOptions.map((s) => ({ value: s.id, label: s.name }))
          ]}
          value={selectedStaff}
          onChange={setSelectedStaff}
          placeholder="Select faculty"
          className="w-full sm:w-96"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="loading-spinner" style={{ width: "2.5rem", height: "2.5rem" }} />
            <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Loading reports...</p>
          </div>
        </div>
      ) : selected ? (
        <div>
          <FacultyReportView staff={selected} />
          <HODSuggestionCard staffId={selectedStaff} semester={selected?.reports?.[0]?.semester || ''} />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {data.map((d) => (
            <FacultyReportView key={d.staffId} staff={d} compact />
          ))}
        </div>
      )}
    </main>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  return (
    <div className="card" style={{ borderLeft: `4px solid ${color}` }}>
      <div className="card-body">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>{label}</p>
            <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{value}</p>
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

function FacultyReportView({ staff, compact = false }: { staff: any; compact?: boolean }) {
  const [expandedReport, setExpandedReport] = useState<string | null>(compact ? null : staff.reports[0]?.assignmentId || null);

  const getOverallScore = (report: any) => {
    const scores = Object.values(report.averages || {}) as number[];
    if (scores.length === 0) return 0;
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  };

  const getScoreColor = (score: number) => {
    const percentage = (score / 5) * 100;
    if (percentage >= 80) return "var(--success)";
    if (percentage >= 60) return "var(--primary)";
    if (percentage >= 40) return "#FFA500";
    return "var(--danger)";
  };

  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg flex items-center justify-center" style={{ backgroundColor: "var(--primary-light)" }}>
          <Users size={20} style={{ color: "var(--primary)" }} />
        </div>
        <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{staff.staffName}</h2>
        <span className="badge badge-secondary">{staff.reports.length} Subject{staff.reports.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {staff.reports.map((report: any) => {
          const overallScore = getOverallScore(report);
          const isExpanded = expandedReport === report.assignmentId;

          return (
            <div key={report.assignmentId} className="card flex flex-col">
              <div className="card-body flex-1 flex flex-col">
                {/* Subject Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-bold text-base mb-1" style={{ color: "var(--text-primary)" }}>
                      {report.subject?.name}
                    </h3>
                    <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                      {report.semester} • {report.subject?.subjectCode}
                    </p>
                  </div>
                  <div className="text-right ml-3">
                    <div className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>
                      Responses
                    </div>
                    <div className="text-sm font-bold" style={{ color: "var(--primary)" }}>
                      {report.submissionCount ?? report.totalResponses} / {report.totalStudents ?? 'N/A'}
                    </div>
                  </div>
                </div>

                {/* Overall Score Badge */}
                <div className="mb-4 p-3 rounded-lg" style={{ background: "var(--hover-overlay)" }}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                      Overall Performance
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="text-2xl font-bold" style={{ color: getScoreColor(overallScore) }}>
                        {overallScore.toFixed(1)}
                      </div>
                      <span className="text-sm" style={{ color: "var(--text-muted)" }}>/5.0</span>
                    </div>
                  </div>
                  <div className="mt-2 w-full h-2 rounded-full" style={{ background: "var(--card-border)" }}>
                    <div 
                      className="h-full rounded-full transition-all duration-300" 
                      style={{ 
                        width: `${(overallScore / 5) * 100}%`, 
                        background: getScoreColor(overallScore) 
                      }}
                    />
                  </div>
                </div>

                {/* Detailed Metrics - flex-1 to push button down */}
                <div className={`flex-1 ${isExpanded ? 'mb-4' : ''}`}>
                  {isExpanded && (
                    <div className="space-y-4">
                      {Object.entries(parameterGroups).map(([groupName, params]) => (
                        <div key={groupName}>
                          <h4 className="text-xs font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>
                            {groupName}
                          </h4>
                          <div className="space-y-2">
                            {params.map(([key, label]) => {
                              const score = report.averages?.[key] ?? 0;
                              const percentage = (score / 5) * 100;
                              return (
                                <div key={key} className="flex items-center gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs truncate" style={{ color: "var(--text-primary)" }}>
                                      {label}
                                    </div>
                                    <div className="w-full h-1.5 rounded-full mt-1" style={{ background: "var(--card-border)" }}>
                                      <div 
                                        className="h-full rounded-full transition-all duration-300" 
                                        style={{ 
                                          width: `${percentage}%`, 
                                          background: getScoreColor(score) 
                                        }}
                                      />
                                    </div>
                                  </div>
                                  <div className="text-xs font-bold shrink-0" style={{ color: getScoreColor(score), minWidth: '45px', textAlign: 'right' }}>
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

                {/* Toggle Button - always at bottom */}
                <button
                  onClick={() => setExpandedReport(isExpanded ? null : report.assignmentId)}
                  className="w-full text-center text-sm font-medium py-2 rounded-lg transition-colors mt-auto"
                  style={{ 
                    color: "var(--primary)",
                    background: "var(--primary-light)"
                  }}
                >
                  {isExpanded ? 'Show Less' : 'View Detailed Metrics'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HODSuggestionCard({ staffId, semester: initialSemester }: { staffId: string; semester: string }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [semester, setSemester] = useState(initialSemester || '');

  useEffect(() => {
    if (!staffId || !semester) return;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/hod/suggestions?staffId=${staffId}&semester=${encodeURIComponent(semester)}`);
        if (!res.ok) return;
        const json = await res.json();
        setText(json.suggestion?.content || '');
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [staffId, semester]);

  async function save() {
    if (!staffId || !semester) {
      toast.error('Please enter the semester (e.g., "Odd 2025-26") before saving.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/hod/suggestions', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ staffId, semester, content: text }) 
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Save failed');
      toast.success('Saved HOD suggestions');
    } catch (err) {
      console.error(err);
      toast.error((err as Error).message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (!staffId) return null;

  return (
    <div className="card mt-6">
      <div className="card-body">
        <h3 className="section-title mb-4">HOD Suggestions & Comments</h3>
        <div className="mb-4">
          <label className="form-label">Semester</label>
          <input 
            value={semester} 
            onChange={(e) => setSemester(e.target.value)} 
            placeholder="e.g., Odd 2025-26"
            className="input-field max-w-md"
          />
        </div>
        <div className="mb-4">
          <label className="form-label">Your Suggestions</label>
          <textarea 
            value={text} 
            onChange={(e) => setText(e.target.value)} 
            className="input-field w-full h-32 resize-none" 
            placeholder={loading ? 'Loading...' : 'Enter your suggestions and feedback for this faculty member...'} 
          />
        </div>
        <Button onClick={save} disabled={saving}>
          {saving ? 'Saving...' : 'Save Suggestions'}
        </Button>
      </div>
    </div>
  );
}
