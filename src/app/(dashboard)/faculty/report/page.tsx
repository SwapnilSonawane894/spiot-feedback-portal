"use client";

import React, { useEffect, useRef, useState } from "react";
import { SkeletonPulse, SkeletonReportCard } from "@/components/skeletons";
import { Download, Building2 } from "lucide-react";

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
        <h1 className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>Student Feedback Analysis</h1>
        {hasMultipleDepartments && (
          <p className="text-sm mt-2" style={{ color: "var(--text-secondary)" }}>
            You have feedback reports from {departmentReports.length} departments
          </p>
        )}
      </div>

      {(!departmentReports || departmentReports.length === 0) && (
        <div className="card">
          <div className="card-body">
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No report data available.</p>
          </div>
        </div>
      )}

      {departmentReports.map((deptData: any, deptIndex: number) => (
        <DepartmentReportSection 
          key={deptData.departmentId} 
          deptData={deptData} 
          staffId={data?.staffId}
          isHomeDepartment={deptData.departmentId === data?.homeDepartmentId}
          showDepartmentLabel={hasMultipleDepartments}
        />
      ))}
    </main>
  );
}

function DepartmentReportSection({ 
  deptData, 
  staffId, 
  isHomeDepartment,
  showDepartmentLabel 
}: { 
  deptData: any; 
  staffId?: string;
  isHomeDepartment: boolean;
  showDepartmentLabel: boolean;
}) {
  const reports = deptData.reports || [];

  return (
    <div className="mb-8">
      {/* Department Header */}
      {showDepartmentLabel && (
        <div className="flex items-center gap-3 mb-4">
          <div 
            className="p-2 rounded-lg flex items-center justify-center" 
            style={{ backgroundColor: "var(--primary-light)" }}
          >
            <Building2 size={20} style={{ color: "var(--primary)" }} />
          </div>
          <div>
            <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
              {deptData.departmentName}
              {deptData.departmentAbbreviation && (
                <span className="ml-2 text-sm font-normal" style={{ color: "var(--text-muted)" }}>
                  ({deptData.departmentAbbreviation})
                </span>
              )}
            </h2>
            {isHomeDepartment && (
              <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: "var(--success)", color: "white" }}>
                Home Department
              </span>
            )}
          </div>
        </div>
      )}

      {/* Download Button */}
      <div className="flex justify-end mb-4">
        {staffId ? (
          <a 
            href={`/api/faculty/${staffId}/report.pdf?departmentId=${deptData.departmentId}`} 
            className="inline-flex items-center gap-2 px-4 py-2 rounded transition-colors"
            style={{ backgroundColor: "var(--primary)", color: "white" }}
            download
          >
            <Download size={16} />
            Download PDF {showDepartmentLabel && `(${deptData.departmentAbbreviation || deptData.departmentName})`}
          </a>
        ) : (
          <button 
            className="px-4 py-2 rounded" 
            style={{ backgroundColor: "var(--text-muted)", color: "white" }}
            disabled
          >
            Download unavailable
          </button>
        )}
      </div>

      {/* Report Card */}
      <div className="card">
        <div className="card-body">
          {/* HOD suggestion (if present) */}
          {deptData.hodSuggestion ? (
            <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: "var(--hover-overlay)", borderLeft: "4px solid var(--primary)" }}>
              <h3 className="font-medium mb-1" style={{ color: "var(--text-primary)" }}>HOD Suggestions</h3>
              <div className="text-sm whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>{deptData.hodSuggestion}</div>
            </div>
          ) : null}

          {/* Subjects list */}
          <div className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
            Subjects: {reports.map((r: any) => r.subject?.name).filter(Boolean).join(', ')}
          </div>

          {/* Single subject - card layout */}
          {reports.length === 1 ? (
            reports.map((r: any) => (
              <section key={r.assignmentId} className="border rounded" style={{ borderColor: "var(--card-border)" }}>
                <div className="p-4 sm:p-6 border-b" style={{ backgroundColor: "var(--hover-overlay)", borderColor: "var(--card-border)" }}>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline">
                    <h2 className="font-medium" style={{ color: "var(--text-primary)" }}>{r.subject?.name} — {r.semester}</h2>
                    <div className="text-sm mt-2 sm:mt-0" style={{ color: "var(--text-muted)" }}>Total responses: {r.totalResponses ?? 0}</div>
                  </div>
                </div>
                <div className="p-4 sm:p-6">
                  <dl className="space-y-3">
                    {Object.keys(PARAM_LABELS).map((key) => (
                      <div key={key} className="flex justify-between items-center border-b py-2" style={{ borderColor: "var(--card-border)" }}>
                        <dt className="text-sm w-3/5" style={{ color: "var(--text-secondary)" }}>{PARAM_LABELS[key]}</dt>
                        <dd className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{r.averages?.[key] ?? '0'} / 5</dd>
                      </div>
                    ))}

                    <div className="flex justify-between items-center pt-2">
                      <dt className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Overall Performance</dt>
                      <dd className="text-sm font-medium" style={{ color: "var(--primary)" }}>{Number(r.overallPercentage ?? 0).toFixed(2)}%</dd>
                    </div>
                  </dl>
                </div>
              </section>
            ))
          ) : (
            /* Multiple subjects - table layout */
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm" style={{ borderColor: "var(--card-border)" }}>
                <thead>
                  <tr>
                    <th className="border px-3 py-2 text-left" style={{ borderColor: "var(--card-border)", color: "var(--text-primary)" }}>Parameter</th>
                    {reports.map((r: any) => (
                      <th key={r.assignmentId} className="border px-3 py-2 text-left whitespace-normal break-words" style={{ borderColor: "var(--card-border)", color: "var(--text-primary)" }}>{r.subject?.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(PARAM_LABELS).map((key) => (
                    <tr key={key}>
                      <td className="border px-3 py-2 align-top" style={{ borderColor: "var(--card-border)", color: "var(--text-secondary)" }}>{PARAM_LABELS[key]}</td>
                      {reports.map((r: any) => (
                        <td key={r.assignmentId + key} className="border px-3 py-2 align-top" style={{ borderColor: "var(--card-border)", color: "var(--text-primary)" }}>{r.averages?.[key] ?? '0'}</td>
                      ))}
                    </tr>
                  ))}

                  <tr>
                    <td className="border px-3 py-2 font-medium" style={{ borderColor: "var(--card-border)", color: "var(--text-primary)" }}>Overall Performance</td>
                    {reports.map((r: any) => (
                      <td key={r.assignmentId + '-overall'} className="border px-3 py-2 font-medium" style={{ borderColor: "var(--card-border)", color: "var(--primary)" }}>{Number(r.overallPercentage ?? 0).toFixed(2)}%</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
