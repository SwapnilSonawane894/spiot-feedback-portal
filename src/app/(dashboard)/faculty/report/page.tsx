"use client";

import React, { useEffect, useRef, useState } from "react";
// PDF is now generated server-side via /api/faculty/[staffId]/report.pdf

const PARAM_LABELS: Record<string, string> = {
  coverage_of_syllabus: "Coverage of syllabus",
  covering_relevant_topics_beyond_syllabus: "Covering relevant topics beyond the syllabus",
  effectiveness_technical_contents: "Effectiveness (technical contents)",
  effectiveness_communication_skills: "Effectiveness (communication skills)",
  effectiveness_teaching_aids: "Effectiveness (teaching aids)",
  motivation_self_learning: "Motivation / self-learning",
  support_practical_performance: "Support - practical performance",
  support_project_seminar: "Support - project & seminar",
  feedback_on_student_progress: "Feedback on student progress",
  punctuality_and_discipline: "Punctuality & discipline",
  domain_knowledge: "Domain knowledge",
  interaction_with_students: "Interaction with students",
  ability_to_resolve_difficulties: "Ability to resolve difficulties",
  encourage_cocurricular: "Encourage cocurricular",
  encourage_extracurricular: "Encourage extracurricular",
  guidance_during_internship: "Guidance during internship",
};

export default function FacultyReportPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const reportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch('/api/faculty/report');
      if (!res.ok) throw new Error('Failed to load report');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Download is handled server-side via the new pdf endpoint

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <main className="p-4 sm:p-8 max-w-7xl mx-auto">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold">Student Feedback Analysis</h1>
        <div className="text-sm text-gray-500 mt-2">Subjects: {data?.reports?.map((r: any) => r.subject?.name).filter(Boolean).join(', ')}</div>
      </div>

      <div className="flex justify-end mb-4">
        {data?.staffId ? (
          <a href={`/api/faculty/${data.staffId}/report.pdf`} className="px-4 py-2 bg-blue-600 text-white rounded" download>
            Download as PDF
          </a>
        ) : (
          <button className="px-4 py-2 bg-gray-400 text-white rounded" disabled>Download unavailable</button>
        )}
      </div>

      <div ref={reportRef} className="bg-white p-4 sm:p-6 rounded shadow">
        {/* HOD suggestion (if present) */}
        {data?.hodSuggestion ? (
          <div className="mb-6 border rounded p-3 bg-gray-50">
            <h3 className="font-medium mb-1">HOD Suggestions</h3>
            <div className="text-sm text-gray-800 whitespace-pre-wrap">{data.hodSuggestion}</div>
          </div>
        ) : null}
        {/* Responsive rendering: if single subject, show stacked card layout; if multiple, show scrollable table */}
        {(!data?.reports || data.reports.length === 0) && (
          <div className="text-sm text-gray-500">No report data available.</div>
        )}

        {data?.reports && data.reports.length === 1 ? (
          data.reports.map((r: any) => (
            <section key={r.assignmentId} className="mb-6 border rounded bg-white">
              <div className="p-4 sm:p-6 border-b bg-gray-50">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline">
                  <h2 className="font-medium">{r.subject?.name} — {r.semester}</h2>
                  <div className="text-sm text-gray-500 mt-2 sm:mt-0">Total responses: {r.totalResponses ?? 0}</div>
                </div>
              </div>
              <div className="p-4 sm:p-6">
                <dl className="space-y-3">
                  {Object.keys(PARAM_LABELS).map((key) => (
                    <div key={key} className="flex justify-between items-center border-b py-2">
                      <dt className="text-sm text-gray-700 w-3/5">{PARAM_LABELS[key]}</dt>
                      <dd className="text-sm font-medium text-gray-900">{r.averages?.[key] ?? '0'} / 5</dd>
                    </div>
                  ))}

                  <div className="flex justify-between items-center pt-2">
                    <dt className="text-sm font-medium">Overall Performance</dt>
                    <dd className="text-sm font-medium">{Number(r.overallPercentage ?? 0).toFixed(2)}%</dd>
                  </div>
                </dl>
              </div>
            </section>
          ))
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[640px] w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border px-3 py-2 text-left">Parameter</th>
                  {data?.reports?.map((r: any) => (
                    <th key={r.assignmentId} className="border px-3 py-2 text-left whitespace-normal break-words">{r.subject?.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.keys(PARAM_LABELS).map((key) => (
                  <tr key={key}>
                    <td className="border px-3 py-2 align-top">{PARAM_LABELS[key]}</td>
                    {data?.reports?.map((r: any) => (
                      <td key={r.assignmentId + key} className="border px-3 py-2 align-top">{r.averages?.[key] ?? '0'}</td>
                    ))}
                  </tr>
                ))}

                <tr>
                  <td className="border px-3 py-2 font-medium">Overall Performance</td>
                  {data?.reports?.map((r: any) => (
                    <td key={r.assignmentId + '-overall'} className="border px-3 py-2 font-medium">{Number(r.overallPercentage ?? 0).toFixed(2)}%</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6">
          <h3 className="text-lg font-medium mb-2">Suggestions for Improvement</h3>
          {data?.suggestions?.length ? (
            <ul className="list-disc pl-5 space-y-2">
              {data.suggestions.map((s: string, idx: number) => <li key={idx}>{s}</li>)}
            </ul>
          ) : (
            <div className="text-sm text-gray-500">No suggestions submitted.</div>
          )}
        </div>
      </div>
    </main>
  );
}
