"use client";

import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";

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

  useEffect(() => {
    fetchReports();
    fetchYears();
  }, []);

  async function fetchYears() {
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
  }

  async function fetchReports() {
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
  }

  const allReleased = data.every((d) => d.reports.every((r: any) => r.isReleased));

  async function handleReleaseAll() {
    try {
      const res = await fetch("/api/hod/release", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Release failed");
      toast.success(`Released ${json.released} feedback(s)`);
      fetchReports();
    } catch (err) {
      console.error(err);
      toast.error((err as Error).message || "Release failed");
    }
  }

  const staffOptions = data.map((d) => ({ id: d.staffId, name: d.staffName }));
  const selected = data.find((d) => d.staffId === selectedStaff) || null;
  

  return (
    <main className="max-w-7xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Feedback Analytics & Reports</h1>
      {/* Generate Comparative Report */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-medium mb-3">Generate Comparative Report</h2>
        <div className="flex items-start flex-col gap-3">
          <label className="text-sm">Select Academic Year:</label>
          <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="px-2 py-1 border rounded">
            {years.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}
          </select>
          <button onClick={() => { if (!selectedYear) return toast.error('Select a year'); window.location.href = `/api/hod/comparative-report?year=${selectedYear}` }} className="px-3 py-1 bg-green-600 text-white rounded">
            Download Excel Report
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <select value={selectedStaff} onChange={(e) => setSelectedStaff(e.target.value)} className="px-2 py-1 border rounded">
          <option value="">All faculty</option>
          {staffOptions.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        {/* Release All Feedback button removed — release/retract is now controlled from the HOD dashboard */}
      </div>

      {loading && <div>Loading...</div>}

      {selected ? (
        <div>
          <h2 className="text-lg font-medium mb-3">{selected.staffName}</h2>
          {selected.reports.map((r: any) => (
            <div key={r.assignmentId} className="bg-white rounded p-4 mb-4 shadow">
              <div className="font-medium">{r.subject?.name} — {r.semester} <span className="text-sm text-gray-500">(Based on {r.submissionCount ?? r.totalResponses} submissions out of {r.totalStudents ?? 'N/A'} students)</span></div>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {params.map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between border-b pb-2">
                    <div className="text-sm text-gray-700">{label}</div>
                    <div className="text-sm font-medium">{r.averages?.[key] ?? 0} / 5</div>
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
            <h2 className="text-lg font-medium mb-2">{d.staffName}</h2>
            {d.reports.map((r: any) => (
              <div key={r.assignmentId} className="bg-white rounded p-4 mb-4 shadow">
                <div className="font-medium">{r.subject?.name} — {r.semester} <span className="text-sm text-gray-500">(Based on {r.submissionCount ?? r.totalResponses} submissions out of {r.totalStudents ?? 'N/A'} students)</span></div>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {params.map(([key, label]) => (
                    <div key={key} className="flex items-center justify-between border-b pb-2">
                      <div className="text-sm text-gray-700">{label}</div>
                      <div className="text-sm font-medium">{r.averages?.[key] ?? 0} / 5</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {/* HOD Suggestions are shown only in the selected staff detail view to avoid duplicates */}
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
      alert('Please enter the semester (e.g., "Odd 2025-26") before saving.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/hod/suggestions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ staffId, semester, content: text }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Save failed');
      alert('Saved HOD suggestions');
    } catch (err) {
      console.error(err);
      alert((err as Error).message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (!staffId) return null;

  return (
    <div className="bg-white rounded p-4 mb-4 shadow">
      <h3 className="text-md font-medium mb-2">HOD Suggestions & Comments</h3>
      <div className="mb-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input value={semester} onChange={(e) => setSemester(e.target.value)} placeholder="Semester (e.g., Odd 2025-26)" className="px-3 py-2 border rounded" />
        <div className="text-sm text-gray-500 self-center">Enter semester for which this suggestion applies.</div>
      </div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} className="w-full border p-2 rounded h-28" placeholder={loading ? 'Loading...' : 'Write suggestions for this faculty...'} />
      <div className="mt-2">
        <button onClick={save} disabled={saving} className="px-3 py-1 bg-blue-600 text-white rounded">{saving ? 'Saving...' : 'Save Suggestions'}</button>
      </div>
    </div>
  );
}
// Removed duplicate client component (older ReportsPage). HODReportsPage is defined above in this file.
