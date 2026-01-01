"use client";

import React, { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { PageHeader } from "@/components/page-header";
import { Calendar, Save, History, CheckCircle } from "lucide-react";
import { CustomSelect } from "@/components/custom-select";

export default function SemesterSettingsPage() {
  const [currentSemester, setCurrentSemester] = useState<number>(1);
  const [academicYear, setAcademicYear] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [semesterString, setSemesterString] = useState("");
  const [semesterHistory, setSemesterHistory] = useState<string[]>([]);

  const semesterOptions = [
    { value: 1, label: "1st Semester (Odd)" },
    { value: 2, label: "2nd Semester (Even)" },
    { value: 3, label: "3rd Semester (Odd)" },
    { value: 4, label: "4th Semester (Even)" },
    { value: 5, label: "5th Semester (Odd)" },
    { value: 6, label: "6th Semester (Even)" },
  ];

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/semester-settings");
      if (!res.ok) throw new Error("Failed to fetch settings");
      const data = await res.json();
      setCurrentSemester(data.currentSemester || 1);
      setAcademicYear(data.academicYear || "");
      setSemesterString(data.semesterString || "");
      setSemesterHistory(data.semesterHistory || []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load semester settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    if (!academicYear || academicYear.trim() === "") {
      toast.error("Please enter an academic year");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/semester-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentSemester,
          academicYear: academicYear.trim(),
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update settings");
      }

      const data = await res.json();
      setSemesterString(data.semesterString);
      setSemesterHistory(data.semesterHistory || []);
      toast.success("Semester settings updated successfully!");
    } catch (error) {
      console.error(error);
      toast.error((error as Error).message || "Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  const generateCurrentYear = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const nextYear = currentYear + 1;
    return `${currentYear}-${nextYear.toString().slice(-2)}`;
  };

  return (
    <main className="max-w-4xl mx-auto">
      <PageHeader
        title="Semester Settings"
        description="Configure the current active semester for the feedback portal"
      />

      <div className="card content-spacing">
        <div className="flex items-start gap-3 mb-6 p-4 rounded-lg" style={{ background: "var(--primary-light)" }}>
          <Calendar size={24} style={{ color: "var(--primary)" }} className="shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
              Current Semester
            </div>
            <div className="text-lg font-bold" style={{ color: "var(--primary)" }}>
              {semesterString || "Loading..."}
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ color: "var(--text-secondary)" }}>Loading settings...</div>
        ) : (
          <div className="space-y-6">
            <div>
              <label className="form-label">Select Current Semester</label>
              <CustomSelect
                value={currentSemester}
                onChange={(value) => setCurrentSemester(Number(value))}
                options={semesterOptions}
                placeholder="Select semester"
              />
              <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>
                Odd semesters: 1, 3, 5 | Even semesters: 2, 4, 6
              </p>
            </div>

            <div>
              <label className="form-label">Academic Year</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  placeholder="2025-26"
                  className="input-field flex-1"
                />
                <button
                  onClick={() => setAcademicYear(generateCurrentYear())}
                  className="btn-secondary whitespace-nowrap"
                  type="button"
                >
                  Use Current
                </button>
              </div>
              <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>
                Format: YYYY-YY (e.g., 2025-26)
              </p>
            </div>

            <div className="border-t pt-6" style={{ borderColor: "var(--card-border)" }}>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary gap-2"
              >
                <Save size={18} />
                {saving ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Semester History Section */}
      <div className="card content-spacing mt-6">
        <div className="flex items-center gap-2 mb-4">
          <History size={20} style={{ color: "var(--primary)" }} />
          <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
            Saved Semesters
          </h3>
        </div>
        <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
          These are the semesters that HOD and Faculty can filter in their reports.
        </p>
        
        {semesterHistory.length > 0 ? (
          <div className="grid gap-2">
            {semesterHistory.map((semester, index) => (
              <div 
                key={index} 
                className="flex items-center gap-3 p-3 rounded-lg"
                style={{ 
                  background: semester === semesterString ? "var(--primary-light)" : "var(--surface-2)",
                  border: semester === semesterString ? "1px solid var(--primary)" : "1px solid var(--card-border)"
                }}
              >
                {semester === semesterString && (
                  <CheckCircle size={18} style={{ color: "var(--primary)" }} />
                )}
                <span 
                  className={semester === semesterString ? "font-semibold" : ""}
                  style={{ color: semester === semesterString ? "var(--primary)" : "var(--text-primary)" }}
                >
                  {semester}
                </span>
                {semester === semesterString && (
                  <span 
                    className="text-xs px-2 py-0.5 rounded-full ml-auto"
                    style={{ background: "var(--primary)", color: "white" }}
                  >
                    Current
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div 
            className="p-4 rounded-lg text-center"
            style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}
          >
            No semesters saved yet. Save the current settings to add to history.
          </div>
        )}
      </div>

      <div className="card content-spacing mt-6">
        <h3 className="text-lg font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
          Important Notes
        </h3>
        <ul className="space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
          <li>• The current semester setting affects feedback collection and reporting across the entire portal</li>
          <li>• HODs will see this semester when assigning faculty to subjects</li>
          <li>• Students will see this semester on their feedback dashboard</li>
          <li>• Make sure to update this at the beginning of each new semester</li>
          <li>• The system automatically detects odd/even semesters based on the number you select</li>
        </ul>
      </div>
    </main>
  );
}
