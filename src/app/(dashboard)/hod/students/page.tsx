"use client";

import React, { useCallback, useEffect, useState } from "react";
import ConfirmationModal from "@/components/confirmation-modal";
import toast from "react-hot-toast";
import { Button } from "@/components/ui-controls";
import { Plus, Upload, Filter } from "lucide-react";
import { CustomSelect } from "@/components/custom-select";

type Student = { id: string; name?: string | null; email?: string | null; academicYearId?: string | null };

export default function StudentsPage(): React.ReactElement {
  const [students, setStudents] = useState<Student[]>([]);
  const [years, setYears] = useState<Array<{ id: string; name: string; abbreviation?: string }>>([]);
  const [file, setFile] = useState<File | null>(null);
  const [academicYearId, setAcademicYearId] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toDeleteId, setToDeleteId] = useState<string | null>(null);
  const [fromYearId, setFromYearId] = useState<string>("");
  const [toYearId, setToYearId] = useState<string>("");
  const [isPromoting, setIsPromoting] = useState(false);
  const [selectedYearId, setSelectedYearId] = useState<string>("");
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentEnroll, setNewStudentEnroll] = useState("");
  const [newStudentYear, setNewStudentYear] = useState("");
  const [isAddingStudent, setIsAddingStudent] = useState(false);

  useEffect(() => {
    fetchStudents();
    fetchYears();
  }, []);

  async function fetchStudents() {
    try {
      const res = await fetch("/api/students");
      if (!res.ok) throw new Error("Failed to fetch students");
      const data = await res.json();
      setStudents(data || []);
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchYears() {
    try {
      const res = await fetch("/api/years");
      if (!res.ok) throw new Error("Failed to fetch years");
      const data = await res.json();
      setYears(data || []);
    } catch (err) {
      console.error(err);
    }
  }

  const handleUpload = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return alert("Please select a CSV file");
    if (!academicYearId) return alert("Please select an Academic Year");

    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("academicYearId", academicYearId);

      const res = await fetch("/api/students/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Upload failed");

      toast.success(`Created ${json.createdCount} students; skipped ${json.skipped?.length ?? 0}`);
      setFile(null);
      const input = document.getElementById("csv-input") as HTMLInputElement | null;
      if (input) input.value = "";
      fetchStudents();
    } catch (err) {
      console.error(err);
      toast.error((err as Error).message || "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }, [file, academicYearId]);

  const confirmDelete = useCallback((id: string) => {
    setToDeleteId(id);
    setConfirmOpen(true);
  }, []);

  const handleDelete = useCallback(async (id: string | null) => {
    if (!id) return setConfirmOpen(false);
    try {
      const res = await fetch(`/api/students/${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Delete failed");
      setStudents((prev) => prev.filter((s) => s.id !== id));
      toast.success("Student deleted");
    } catch (err) {
      console.error(err);
      toast.error((err as Error).message || "Delete failed");
    } finally {
      setConfirmOpen(false);
      setToDeleteId(null);
    }
  }, []);

  const handleAddStudent = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newStudentName || !newStudentEnroll || !newStudentYear) {
      return toast.error('Please fill all fields');
    }
    setIsAddingStudent(true);
    try {
      const res = await fetch('/api/students', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ fullName: newStudentName, enrollment: newStudentEnroll, academicYearId: newStudentYear }) 
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to add student');
      toast.success('Student added');
      setIsAddStudentModalOpen(false);
      setNewStudentName(''); 
      setNewStudentEnroll(''); 
      setNewStudentYear('');
      fetchStudents();
    } catch (err) {
      console.error(err);
      toast.error((err as Error).message || 'Add failed');
    } finally {
      setIsAddingStudent(false);
    }
  }, [newStudentName, newStudentEnroll, newStudentYear]);

  const handlePromote = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromYearId || !toYearId) return toast.error("Please select both from and to academic years");
    if (fromYearId === toYearId) return toast.error("From and To must be different");
    setIsPromoting(true);
    try {
      const res = await fetch("/api/students/promote", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ fromYearId, toYearId }) 
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Promote failed");
      toast.success(`Successfully promoted ${json.promoted ?? 0} students.`);
      fetchStudents();
    } catch (err) {
      console.error(err);
      toast.error((err as Error).message || "Promote failed");
    } finally {
      setIsPromoting(false);
    }
  }, [fromYearId, toYearId]);

  const openAddStudentModal = useCallback(() => {
    setIsAddStudentModalOpen(true);
  }, []);

  const closeAddStudentModal = useCallback(() => {
    setIsAddStudentModalOpen(false);
  }, []);

  const filteredStudents = selectedYearId 
    ? students.filter((st) => st.academicYearId === selectedYearId) 
    : students;

  const yearOptions = [
    { value: "", label: "All years" },
    ...years.map((y) => ({ value: y.id, label: y.abbreviation ?? y.name })),
  ];

  const uploadYearOptions = [
    { value: "", label: "Select year" },
    ...years.map((y) => ({ value: y.id, label: y.abbreviation ?? y.name })),
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Manage Students</h1>
        <p className="page-description">Add, upload, and manage student records</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        <div className="card content-spacing">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title mb-0">Upload Students</h2>
            <Button onClick={openAddStudentModal} variant="outline" className="gap-2">
              <Plus size={16} />
              Add Single
            </Button>
          </div>
          <p className="section-description mb-5">
            Upload a CSV file with columns: enrollmentNumber, fullName, department
          </p>

          <form onSubmit={handleUpload} className="space-y-4">
            <CustomSelect
              label="Academic Year"
              options={uploadYearOptions}
              value={academicYearId}
              onChange={setAcademicYearId}
              placeholder="Select year"
            />

            <div>
              <label className="form-label">CSV File</label>
              <div className="flex items-center gap-3">
                <label htmlFor="csv-input" className="btn-outline cursor-pointer">
                  Choose file
                </label>
                <input
                  id="csv-input"
                  type="file"
                  accept=".csv"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="hidden"
                />
                <span className="text-sm truncate" style={{ color: "var(--text-secondary)" }}>
                  {file ? file.name : "No file selected"}
                </span>
              </div>
            </div>

            <Button type="submit" disabled={isUploading} className="gap-2 w-full sm:w-auto">
              <Upload size={16} />
              {isUploading ? "Uploading..." : "Upload Students"}
            </Button>
          </form>
        </div>

        <div className="card content-spacing">
          <h2 className="section-title">Promote Students</h2>
          <p className="section-description mb-5">Move all students from one year to the next</p>

          <form onSubmit={handlePromote} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <CustomSelect
                label="From Year"
                options={uploadYearOptions}
                value={fromYearId}
                onChange={setFromYearId}
                placeholder="Select year"
              />
              <CustomSelect
                label="To Year"
                options={uploadYearOptions}
                value={toYearId}
                onChange={setToYearId}
                placeholder="Select year"
              />
            </div>

            <Button type="submit" disabled={isPromoting} className="w-full sm:w-auto">
              {isPromoting ? "Promoting..." : "Promote All Students"}
            </Button>
          </form>
        </div>
      </div>

      <div className="card content-spacing">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <h2 className="section-title mb-0">Student List</h2>
          <div className="flex items-center gap-2">
            <Filter size={16} style={{ color: "var(--text-muted)" }} />
            <CustomSelect
              options={yearOptions}
              value={selectedYearId}
              onChange={setSelectedYearId}
              placeholder="Filter by year"
              className="w-48"
            />
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email (Enrollment No.)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center py-8" style={{ color: "var(--text-muted)" }}>
                    No students found
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => (
                  <tr key={s.id}>
                    <td>{s.name}</td>
                    <td>{s.email}</td>
                    <td>
                      <button onClick={() => confirmDelete(s.id)} className="btn-danger-text">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmationModal
        open={confirmOpen}
        title="Delete student"
        description="This will permanently delete the student and related accounts. Are you sure?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={() => handleDelete(toDeleteId)}
        onCancel={() => { setConfirmOpen(false); setToDeleteId(null); }}
      />

      {isAddStudentModalOpen && (
        <div className="modal-overlay" onClick={closeAddStudentModal}>
          <div
            role="dialog"
            aria-modal="true"
            className="modal-content w-full max-w-md content-spacing"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-5" style={{ color: "var(--text-primary)" }}>
              Add Single Student
            </h3>
            <form onSubmit={handleAddStudent} className="space-y-4">
              <div>
                <label className="form-label">Full Name</label>
                <input
                  className="input-field"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  placeholder="Enter student name"
                  required
                />
              </div>
              <div>
                <label className="form-label">Enrollment Number</label>
                <input
                  className="input-field"
                  value={newStudentEnroll}
                  onChange={(e) => setNewStudentEnroll(e.target.value)}
                  placeholder="Enter enrollment number"
                  required
                />
              </div>
              <CustomSelect
                label="Academic Year"
                options={uploadYearOptions}
                value={newStudentYear}
                onChange={setNewStudentYear}
                placeholder="Select year"
              />
              <div className="flex items-center gap-3 justify-end pt-4 border-t" style={{ borderColor: "var(--card-border)" }}>
                <Button type="button" onClick={closeAddStudentModal} variant="outline">
                  Cancel
                </Button>
                <Button type="submit" disabled={isAddingStudent}>
                  {isAddingStudent ? "Adding..." : "Add Student"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
