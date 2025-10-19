"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Button, Input } from "@/components/ui-controls";

const params = [
  ["coverage_of_syllabus", "Coverage of syllabus"],
  ["covering_relevant_topics_beyond_syllabus", "Covering relevant topics beyond the syllabus"],
  ["effectiveness_technical_contents", "Effectiveness in terms of technical contents/ course contents"],
  ["effectiveness_communication_skills", "Effectiveness in terms of communication skills"],
  ["effectiveness_teaching_aids", "Effectiveness in terms of teaching aids"],
  ["motivation_self_learning", "Motivation and inspiration for students to learn in self-learning mode"],
  ["support_practical_performance", "Support for development of student skills: practical performance"],
  ["support_project_seminar", "Support for development of student skills: project and seminar preparation"],
  ["feedback_on_student_progress", "Feedback provided on student progress"],
  ["punctuality_and_discipline", "Punctuality and discipline"],
  ["domain_knowledge", "Domain knowledge"],
  ["interaction_with_students", "Interaction with students"],
  ["ability_to_resolve_difficulties", "Ability to resolve difficulties"],
  ["encourage_cocurricular", "Encourage to participate in cocurricular activities"],
  ["encourage_extracurricular", "Encourage to participate in extracurricular activities"],
  ["guidance_during_internship", "Guidance during internship"],
];

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
  
  return (
    <main className="max-w-7xl mx-auto">
      <div className="page-header">
        <h1 className="page-title">Feedback Analytics & Reports</h1>
        <p className="page-description">View and download faculty feedback reports</p>
      </div>

      {/* Generate Comparative Report */}
      <div className="card card-body mb-6 hover-lift">
        <h2 className="section-title mb-4">Generate Comparative Report</h2>
        <div className="flex items-start flex-col gap-4">
          <div className="w-full sm:w-auto">
            <label className="input-label">Select Academic Year:</label>
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(e.target.value)} 
              className="input-field w-full sm:w-64"
            >
              {years.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}
            </select>
          </div>
          <Button onClick={handleDownloadReport}>
            Download Excel Report
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <select 
          value={selectedStaff} 
          onChange={(e) => setSelectedStaff(e.target.value)} 
          className="input-field"
        >
          <option value="">All faculty</option>
          {staffOptions.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
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
          <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>{selected.staffName}</h2>
          {selected.reports.map((r: any) => (
            <div key={r.assignmentId} className="card card-body mb-4 hover-lift">
              <div className="font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
                {r.subject?.name} — {r.semester}{" "}
                <span className="text-sm font-normal" style={{ color: "var(--text-secondary)" }}>
                  (Based on {r.submissionCount ?? r.totalResponses} submissions out of {r.totalStudents ?? 'N/A'} students)
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {params.map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between pb-3" style={{ borderBottom: "1px solid var(--card-border)" }}>
                    <div className="text-sm" style={{ color: "var(--text-secondary)" }}>{label}</div>
                    <div className="text-sm font-semibold" style={{ color: "var(--primary)" }}>{r.averages?.[key] ?? 0} / 5</div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* HOD Suggestions Card (selected staff) */}
          <HODSuggestionCard staffId={selectedStaff} semester={selected?.reports?.[0]?.semester || ''} />
        </div>
      ) : (
        data.map((d) => (
          <div key={d.staffId} className="mb-6">
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--text-primary)" }}>{d.staffName}</h2>
            {d.reports.map((r: any) => (
              <div key={r.assignmentId} className="card card-body mb-4 hover-lift">
                <div className="font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
                  {r.subject?.name} — {r.semester}{" "}
                  <span className="text-sm font-normal" style={{ color: "var(--text-secondary)" }}>
                    (Based on {r.submissionCount ?? r.totalResponses} submissions out of {r.totalStudents ?? 'N/A'} students)
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {params.map(([key, label]) => (
                    <div key={key} className="flex items-center justify-between pb-3" style={{ borderBottom: "1px solid var(--card-border)" }}>
                      <div className="text-sm" style={{ color: "var(--text-secondary)" }}>{label}</div>
                      <div className="text-sm font-semibold" style={{ color: "var(--primary)" }}>{r.averages?.[key] ?? 0} / 5</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))
      )}
    </main>
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
    <div className="card card-body mb-4 hover-lift">
      <h3 className="section-title mb-3">HOD Suggestions & Comments</h3>
      <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Input 
            value={semester} 
            onChange={(e) => setSemester(e.target.value)} 
            placeholder="Semester (e.g., Odd 2025-26)" 
          />
        </div>
        <div className="text-sm self-center" style={{ color: "var(--text-muted)" }}>
          Enter semester for which this suggestion applies.
        </div>
      </div>
      <textarea 
        value={text} 
        onChange={(e) => setText(e.target.value)} 
        className="input-field w-full h-28 resize-none" 
        placeholder={loading ? 'Loading...' : 'Write suggestions for this faculty...'} 
      />
      <div className="mt-3">
        <Button onClick={save} disabled={saving}>
          {saving ? 'Saving...' : 'Save Suggestions'}
        </Button>
      </div>
    </div>
  );
}
