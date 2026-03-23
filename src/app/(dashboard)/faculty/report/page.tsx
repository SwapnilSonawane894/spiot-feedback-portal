"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { SkeletonPulse, SkeletonReportCard } from "@/components/skeletons";
import { Download, Building2, Calendar, Info, MessageSquare, Send } from "lucide-react";
import { CustomSelect } from "@/components/custom-select";
import toast from "react-hot-toast";
import { DepartmentReportSection, RatingScaleLegend } from "@/components/faculty-report-preview";

export default function FacultyReportPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [semesters, setSemesters] = useState<string[]>([]);
  const [selectedSemester, setSelectedSemester] = useState<string>('');
  const [semestersLoading, setSemestersLoading] = useState(true);
  const reportRef = useRef<HTMLDivElement | null>(null);

  // Fetch available semesters from database
  const fetchSemesters = useCallback(async () => {
    setSemestersLoading(true);
    try {
      const res = await fetch('/api/semesters');
      if (!res.ok) throw new Error('Failed to load semesters');
      const json = await res.json();
      setSemesters(json.semesters || []);
      // Set current semester as default
      if (json.currentSemester) {
        setSelectedSemester(json.currentSemester);
      } else if (json.semesters && json.semesters.length > 0) {
        setSelectedSemester(json.semesters[0]);
      }
    } catch (err) {
      // console.error(err);
    } finally {
      setSemestersLoading(false);
    }
  }, []);

  const fetchData = useCallback(async (semester: string) => {
    if (!semester) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/faculty/report?semester=${encodeURIComponent(semester)}`);
      if (!res.ok) throw new Error('Failed to load report');
      const json = await res.json();
      setData(json);
    } catch (err) {
      // console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSemesters();
  }, [fetchSemesters]);

  useEffect(() => {
    if (selectedSemester) {
      fetchData(selectedSemester);
    }
  }, [selectedSemester, fetchData]);

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

      {/* Semester Filter */}
      <div className="mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <CustomSelect
            label="Semester"
            options={semesters.map((s) => ({ value: s, label: s }))}
            value={selectedSemester}
            onChange={setSelectedSemester}
            placeholder={semestersLoading ? "Loading..." : "Select semester"}
            className="w-full sm:w-64"
          />
        </div>
      </div>

      {(!departmentReports || departmentReports.length === 0) && (
        <div className="card">
          <div className="card-body">
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No report data available for {selectedSemester || 'this semester'}.</p>
          </div>
        </div>
      )}

      {departmentReports.map((deptData: any, deptIndex: number) => (
        <DepartmentReportSection 
          key={deptData.departmentId} 
          deptData={deptData} 
          staffId={data?.staffId}
          semester={selectedSemester}
          isHomeDepartment={deptData.departmentId === data?.homeDepartmentId}
          showDepartmentLabel={hasMultipleDepartments}
          onResponseSaved={() => fetchData(selectedSemester)}
        />
      ))}

      {/* Rating Scale Legend - at the end */}
      <RatingScaleLegend />
    </main>
  );
}
