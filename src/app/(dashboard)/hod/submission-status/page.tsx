"use client";

import React, { useEffect, useState } from "react";
import { CustomSelect } from "@/components/custom-select";

export default function SubmissionStatusPage() {
  const [data, setData] = useState<any[]>([]);
  const [semester, setSemester] = useState<string | null>(null);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
      // If no year was requested and the API returned available years, auto-select the first one so totals reflect that year
      if (!yearId && years.length > 0 && years[0] && years[0].id) {
        const defaultId = years[0].id;
        setSelectedYearId(defaultId);
        // fetch again with selected year to get correct totals
        setLoading(false);
        await fetchData(defaultId);
        return;
      }

      setSelectedYearId(json.selectedYearId || null);
      const students = (json.students || []).slice();
      // sort by completedTasks desc so students who have submitted appear at top
      students.sort((a: any, b: any) => (b.completedTasks || 0) - (a.completedTasks || 0));
      setData(students);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

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
        <div className="flex items-center justify-center py-12">
          <div style={{ color: "var(--text-muted)" }}>Loading...</div>
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
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8" style={{ color: "var(--text-muted)" }}>
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
