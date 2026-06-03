"use client";

import React, { useEffect, useState, useCallback } from "react";
import { CustomSelect } from "@/components/custom-select";
import { SkeletonTable } from '@/components/skeletons';
import { Eye, X, CheckCircle, Clock } from "lucide-react";

type StudentFeedback = {
  assignmentId: string;
  subjectName: string;
  subjectCode: string;
  facultyName: string;
  status: string;
  ratings: { param: string; label: string; value: number }[];
  suggestion: string | null;
  submittedAt: string | null;
};

type StudentDetails = {
  student: { id: string; name: string; email: string };
  feedbacks: StudentFeedback[];
};

export default function SubmissionStatusPage() {
  const [data, setData] = useState<any[]>([]);
  const [semester, setSemester] = useState<string | null>(null);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentDetails | null>(null);
  const [loadingStudent, setLoadingStudent] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData(yearId?: string | null) {
    setLoading(true);
    try {
      const url = '/api/hod/submission-status' + (yearId ? `?yearId=${encodeURIComponent(yearId)}` : '');
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load');
      const json = await res.json();
      setSemester(json.semester || null);
      
      const years = Array.isArray(json.academicYears) ? json.academicYears : [];
      setAcademicYears(years);
      
      if (!yearId && years.length > 0 && years[0] && years[0].id) {
        const defaultId = years[0].id;
        setSelectedYearId(defaultId);
        setLoading(false);
        await fetchData(defaultId);
        return;
      }

      setSelectedYearId(json.selectedYearId || null);
      const students = (json.students || []).slice();
      students.sort((a: any, b: any) => (b.completedTasks || 0) - (a.completedTasks || 0));
      setData(students);
    } catch (err) {
      // console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const viewStudentFeedback = useCallback(async (studentEmail: string) => {
    setLoadingStudent(true);
    setViewModalOpen(true);
    try {
      // Find student ID from email (enrollment number)
      const student = data.find(s => s.email === studentEmail);
      if (!student) return;
      
      const res = await fetch(`/api/hod/student-feedback?studentId=${encodeURIComponent(student.id || studentEmail)}`);
      if (!res.ok) throw new Error('Failed to load student feedback');
      const details = await res.json();
      setSelectedStudent(details);
    } catch (err) {
      // console.error(err);
      setSelectedStudent(null);
    } finally {
      setLoadingStudent(false);
    }
  }, [data]);

  const closeModal = useCallback(() => {
    setViewModalOpen(false);
    setSelectedStudent(null);
  }, []);

  const yearOptions = [
    { value: "", label: "All Years" },
    ...academicYears.filter((y) => y && y.id).map((y) => ({ value: y.id, label: y.abbreviation || y.name }))
  ];

  return (
    <main className="max-w-5xl mx-auto">
      <div className="flex items-start flex-col gap-4 justify-between mb-6">
        <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
          Feedback Submission Status {semester ? `— ${semester}` : ''}
        </h1>
        <CustomSelect
          label="Filter by Year"
          options={yearOptions}
          value={selectedYearId || ''}
          onChange={(v) => { const value = v || null; setSelectedYearId(value); fetchData(value); }}
          placeholder="Select year"
          className="w-full sm:w-64"
        />
      </div>

      {loading ? (
        <div className="py-2">
          <SkeletonTable rows={6} columns={5} />
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Student Name</th>
                <th>Enrollment No.</th>
                <th>Year</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8" style={{ color: "var(--text-muted)" }}>
                    {academicYears.length === 0 
                      ? "No students or subjects found for your department" 
                      : "No students found for the selected year"}
                  </td>
                </tr>
              ) : (
                data.map((s: any) => (
                  <tr key={s.email}>
                    <td>{s.name}</td>
                    <td>{s.email}</td>
                    <td>{s.year || '—'}</td>
                    <td>
                      <span style={{ 
                        color: s.completedTasks === s.totalTasks ? "var(--success)" : "var(--text-secondary)"
                      }}>
                        {s.completedTasks} / {s.totalTasks} Submitted
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => viewStudentFeedback(s.email)}
                        className="btn-icon"
                        title="View Feedback"
                        style={{ 
                          padding: '6px 10px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: 'var(--primary-light)',
                          color: 'var(--primary)',
                          borderRadius: '6px',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '13px',
                        }}
                      >
                        <Eye size={16} />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* View Feedback Modal */}
      {viewModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div 
            className="modal-content w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--card-border)' }}>
              <div>
                <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Student Feedback Details
                </h3>
                {selectedStudent && (
                  <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                    {selectedStudent.student.name} ({selectedStudent.student.email})
                  </p>
                )}
              </div>
              <button onClick={closeModal} className="p-2 rounded-lg hover:bg-gray-100" style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5">
              {loadingStudent ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--primary)' }}></div>
                  <span className="ml-3" style={{ color: 'var(--text-secondary)' }}>Loading...</span>
                </div>
              ) : selectedStudent ? (
                <div className="space-y-6">
                  {selectedStudent.feedbacks.length === 0 ? (
                    <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                      No feedback data available
                    </div>
                  ) : (
                    selectedStudent.feedbacks.map((fb, idx) => (
                      <div key={fb.assignmentId || idx} className="border rounded-lg p-4" style={{ borderColor: 'var(--card-border)' }}>
                        {/* Subject Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h4 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                              {fb.subjectName}
                            </h4>
                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                              {fb.subjectCode} • Faculty: {fb.facultyName}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {fb.status === 'Completed' ? (
                              <span className="flex items-center gap-1 text-sm px-2 py-1 rounded-full" style={{ background: 'rgba(34, 197, 94, 0.1)', color: 'var(--success)' }}>
                                <CheckCircle size={14} />
                                Submitted
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-sm px-2 py-1 rounded-full" style={{ background: 'rgba(234, 179, 8, 0.1)', color: '#EAB308' }}>
                                <Clock size={14} />
                                Pending
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Ratings */}
                        {fb.status === 'Completed' && fb.ratings.length > 0 ? (
                          <div className="space-y-3">
                            <div className="grid gap-2">
                              {fb.ratings.map((r) => (
                                <div key={r.param} className="flex items-center justify-between py-1.5 px-3 rounded" style={{ background: 'var(--surface-2)' }}>
                                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{r.label}</span>
                                  <span className="font-medium" style={{ color: r.value >= 4 ? 'var(--success)' : r.value >= 3 ? 'var(--primary)' : 'var(--danger)' }}>
                                    {r.value}/5
                                  </span>
                                </div>
                              ))}
                            </div>
                            
                            {/* Calculate and show average */}
                            {fb.ratings.length > 0 && (
                              <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'var(--card-border)' }}>
                                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>Overall Average</span>
                                <span className="text-lg font-bold" style={{ color: 'var(--primary)' }}>
                                  {(fb.ratings.reduce((sum, r) => sum + r.value, 0) / fb.ratings.length).toFixed(2)}/5
                                </span>
                              </div>
                            )}

                            {/* Suggestion if any */}
                            {fb.suggestion && (
                              <div className="mt-3 p-3 rounded-lg" style={{ background: 'var(--primary-light)' }}>
                                <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Student Suggestion:</p>
                                <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{fb.suggestion}</p>
                              </div>
                            )}
                          </div>
                        ) : fb.status !== 'Completed' ? (
                          <div className="text-center py-4" style={{ color: 'var(--text-muted)' }}>
                            Feedback not yet submitted
                          </div>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                  Failed to load student feedback
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t flex justify-end" style={{ borderColor: 'var(--card-border)' }}>
              <button onClick={closeModal} className="btn-outline">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
