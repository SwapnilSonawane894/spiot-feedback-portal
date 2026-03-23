/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";

import React, { useState, useEffect } from "react";
import { Download, Building2, Info, MessageSquare, Send } from "lucide-react";
import toast from "react-hot-toast";

export const PARAM_LABELS: Record<string, string> = {
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

// Helper function to get rating based on percentage
export function getRating(percentage: number): string {
  if (percentage >= 95) return 'Outstanding';
  if (percentage >= 90) return 'Excellent';
  if (percentage >= 80) return 'Very Good';
  if (percentage >= 70) return 'Good';
  if (percentage >= 50) return 'Satisfactory';
  return 'Needs Improvement';
}

// Get color for rating
export function getRatingColor(percentage: number): string {
  if (percentage >= 90) return 'var(--success)';
  if (percentage >= 70) return 'var(--primary)';
  if (percentage >= 50) return '#FFA500';
  return 'var(--danger)';
}

export function RatingScaleLegend() {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const ratingScale = [
    { range: '95-100%', rating: 'Outstanding', color: 'var(--success)' },
    { range: '90-95%', rating: 'Excellent', color: 'var(--success)' },
    { range: '80-90%', rating: 'Very Good', color: 'var(--primary)' },
    { range: '70-80%', rating: 'Good', color: 'var(--primary)' },
    { range: '50-70%', rating: 'Satisfactory', color: '#FFA500' },
    { range: '<50%', rating: 'Needs Improvement', color: 'var(--danger)' },
  ];

  return (
    <div className="card mb-6">
      <div 
        className="card-body cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2 mb-2">
          <Info size={18} style={{ color: "var(--primary)" }} />
          <h3 className="font-medium" style={{ color: "var(--text-primary)" }}>
            Overall Rating Scale
          </h3>
          <span className="text-xs ml-auto" style={{ color: "var(--text-muted)" }}>
            {isExpanded ? 'Click to collapse' : 'Click to expand'}
          </span>
        </div>
        
        {isExpanded && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mt-3">
            {ratingScale.map((item) => (
              <div 
                key={item.range} 
                className="p-2 rounded-lg text-center"
                style={{ backgroundColor: "var(--hover-overlay)" }}
              >
                <div className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                  {item.range}
                </div>
                <div className="text-sm font-bold mt-1" style={{ color: item.color }}>
                  {item.rating}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function DepartmentReportSection({ 
  deptData, 
  staffId, 
  semester,
  isHomeDepartment,
  showDepartmentLabel,
  onResponseSaved,
  isHodMode = false
}: { 
  deptData: any; 
  staffId?: string;
  semester?: string;
  isHomeDepartment: boolean;
  showDepartmentLabel: boolean;
  onResponseSaved?: () => void;
  isHodMode?: boolean;
}) {
  const reports = deptData.reports || [];
  const [facultyResponse, setFacultyResponse] = useState(deptData.facultyResponse || '');
  const [isSaving, setIsSaving] = useState(false);

  // Update state when deptData changes
  useEffect(() => {
    setFacultyResponse(deptData.facultyResponse || '');
  }, [deptData.facultyResponse]);

  const saveFacultyResponse = async () => {
    if (isHodMode) return;
    
    if (!semester) {
      toast.error('Please select a semester first');
      return;
    }
    
    setIsSaving(true);
    try {
      const res = await fetch('/api/faculty/response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          semester,
          facultyResponse,
          suggestionId: deptData.suggestionId
        })
      });
      
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to save response');
      }
      
      toast.success('Response saved successfully');
      onResponseSaved?.();
    } catch (error) {
      toast.error((error as Error).message || 'Failed to save response');
    } finally {
      setIsSaving(false);
    }
  };

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
            href={`/api/faculty/${staffId}/report.pdf?departmentId=${deptData.departmentId}${semester ? `&semester=${encodeURIComponent(semester)}` : ''}`} 
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
          {/* HOD Suggestions Section */}
          <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: "var(--hover-overlay)", borderLeft: "4px solid var(--primary)" }}>
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare size={18} style={{ color: "var(--primary)" }} />
              <h3 className="font-medium" style={{ color: "var(--text-primary)" }}>HOD Suggestions</h3>
            </div>
            {deptData.hodSuggestion ? (
              <ol className="list-decimal list-inside space-y-1">
                {deptData.hodSuggestion.split('\n').filter((line: string) => line.trim()).map((point: string, idx: number) => (
                  <li key={idx} className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    {point.trim()}
                  </li>
                ))}
              </ol>
            ) : (
              <div className="text-sm italic" style={{ color: "var(--text-muted)" }}>
                No suggestion from HOD yet.
              </div>
            )}
          </div>

          {/* Faculty Response Section */}
          <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: "var(--hover-overlay)", borderLeft: "4px solid var(--success)" }}>
            <div className="flex items-center gap-2 mb-2">
              <Send size={18} style={{ color: "var(--success)" }} />
              <h3 className="font-medium" style={{ color: "var(--text-primary)" }}>
                {isHodMode ? "Faculty Response to HOD Suggestions" : "Your Response to HOD Suggestions"}
              </h3>
            </div>
            {!isHodMode && (
              <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
                Clarify your comments or action plan based on the HOD suggestions above. Enter each point on a new line - they will be automatically numbered.
              </p>
            )}
            
            {isHodMode ? (
              // HOD Mode: Display as a list or a message if empty
              facultyResponse && facultyResponse.trim() ? (
                <ol className="list-decimal list-inside space-y-1">
                  {facultyResponse.split('\n').filter((line: string) => line.trim()).map((point: string, idx: number) => (
                    <li key={idx} className="text-sm" style={{ color: "var(--text-secondary)" }}>
                      {point.trim()}
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="text-sm italic" style={{ color: "var(--text-muted)" }}>
                  No response from faculty yet.
                </div>
              )
            ) : (
              // Faculty Mode: Display input area
              <>
                <textarea
                  value={facultyResponse}
                  onChange={(e) => setFacultyResponse(e.target.value)}
                  placeholder={deptData.hodSuggestion ? "Enter your response (one point per line)..." : "No HOD suggestion to respond to yet."}
                  disabled={!deptData.hodSuggestion}
                  className="w-full p-3 rounded-lg border text-sm resize-none h-24"
                  style={{ 
                    backgroundColor: deptData.hodSuggestion ? "var(--card-bg)" : "var(--hover-overlay)",
                    borderColor: "var(--card-border)",
                    color: "var(--text-primary)"
                  }}
                />
                {/* Preview numbered points */}
                {facultyResponse && facultyResponse.split('\n').filter((line: string) => line.trim()).length > 0 && (
                  <div className="mt-3 p-3 rounded-lg" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
                    <p className="text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Preview (as numbered points):</p>
                    <ol className="list-decimal list-inside space-y-1">
                      {facultyResponse.split('\n').filter((line: string) => line.trim()).map((point: string, idx: number) => (
                        <li key={idx} className="text-sm" style={{ color: "var(--text-primary)" }}>
                          {point.trim()}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
                {deptData.hodSuggestion && (
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={saveFacultyResponse}
                      disabled={isSaving}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded text-sm transition-colors"
                      style={{ backgroundColor: "var(--success)", color: "white", opacity: isSaving ? 0.7 : 1 }}
                    >
                      <Send size={14} />
                      {isSaving ? 'Saving...' : 'Save Response'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

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
                    <div className="flex justify-between items-center pt-2 border-t" style={{ borderColor: "var(--card-border)" }}>
                      <dt className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Overall Rating</dt>
                      <dd className="text-sm font-bold" style={{ color: getRatingColor(Number(r.overallPercentage ?? 0)) }}>
                        {getRating(Number(r.overallPercentage ?? 0))}
                      </dd>
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
                  <tr>
                    <td className="border px-3 py-2 font-medium" style={{ borderColor: "var(--card-border)", color: "var(--text-primary)" }}>Overall Rating</td>
                    {reports.map((r: any) => (
                      <td key={r.assignmentId + '-rating'} className="border px-3 py-2 font-bold" style={{ borderColor: "var(--card-border)", color: getRatingColor(Number(r.overallPercentage ?? 0)) }}>
                        {getRating(Number(r.overallPercentage ?? 0))}
                      </td>
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
