"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

const params: [string, string][] = [
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

export default function FacultyDashboardPage(): React.ReactElement {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [reports, setReports] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [staffId, setStaffId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) return;
    const role = (session as any).user?.role;
    if (role !== "STAFF" && role !== "FACULTY") {
      // unauthorized for this view
      router.replace("/");
      return;
    }

    async function fetchReports() {
      setLoading(true);
      try {
        const res = await fetch("/api/faculty/report");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setReports(data.reports || []);
        setStaffId(data.staffId || null);
      } catch (err: any) {
        console.error(err);
        setError(err?.message || "Failed to load reports");
      } finally {
        setLoading(false);
      }
    }

    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, status]);

  if (status === "loading" || loading) return <div className="max-w-7xl mx-auto">Loading...</div>;
  if (!session) return <div className="max-w-7xl mx-auto">Unauthorized</div>;

  return (
    <main className="max-w-7xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">My Feedback Report</h1>
      {error && <div className="bg-red-50 text-red-700 rounded">{error}</div>}
      <div className="mb-4">
        {staffId ? (
          <a href={`/api/faculty/${staffId}/report.pdf`} className="px-3 py-2 bg-blue-600 text-white rounded">Download as PDF</a>
        ) : null}
      </div>
      {reports && reports.length === 0 && <div className="bg-white rounded p-6">Your feedback reports for this semester have not been released by the HOD yet.</div>}
      {reports && reports.map((r) => (
        <div key={r.assignmentId} className="bg-white rounded p-4 mb-4 shadow">
          <div className="font-medium">{r.subject?.name} — {r.semester}</div>
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {params.map(([key, label]) => (
              <div key={key} className="flex items-center justify-between border-b pb-2">
                <div className="text-sm text-gray-700">{label}</div>
                <div className="text-sm font-medium">{r.averages?.[key] ?? 0} / 5</div>
              </div>
            ))}
          </div>
          <div className="text-sm text-gray-500 mt-2">Total responses: {r.totalResponses}</div>
        </div>
      ))}
    </main>
  );
}
