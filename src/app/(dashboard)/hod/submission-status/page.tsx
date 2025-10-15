"use client";

import React, { useEffect, useState } from "react";

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
      const years = json.academicYears || [];
      setAcademicYears(years);
      // If no year was requested and the API returned available years, auto-select the first one so totals reflect that year
      if (!yearId && years.length > 0) {
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

  return (
    <main className="max-w-5xl mx-auto">
      <div className="flex items-start flex-col gap-1 justify-between mb-4">
        <h1 className="text-2xl font-semibold">Feedback Submission Status {semester ? `— ${semester}` : ''}</h1>
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-600">Filter by Year</label>
          <select value={selectedYearId || ''} onChange={(e) => { const v = e.target.value || null; setSelectedYearId(v); fetchData(v); }} className="border px-2 py-1 rounded">
            <option value="">All Years</option>
            {academicYears.map((y) => (
              <option key={y.id} value={y.id}>{y.abbreviation || y.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? <div>Loading...</div> : (
        <div className="bg-white rounded shadow">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">Student Name</th>
                <th className="px-4 py-2 text-left">Enrollment No.</th>
                <th className="px-4 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.map((s: any) => (
                <tr key={s.email} className="border-t">
                  <td className="px-4 py-2">{s.name}</td>
                  <td className="px-4 py-2">{s.email}</td>
                  <td className="px-4 py-2">{s.completedTasks} / {s.totalTasks} Submitted</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
