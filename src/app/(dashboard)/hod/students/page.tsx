"use client";

import React, { useEffect, useState } from "react";
import ConfirmationModal from "@/components/confirmation-modal";
import toast from "react-hot-toast";

type Student = { id: string; name?: string | null; email?: string | null; academicYearId?: string | null };

export default function StudentsPage(): React.ReactElement {
  const [students, setStudents] = useState<Student[]>([]);
  const [years, setYears] = useState<Array<{ id: string; name: string; abbreviation?: string }>>([]);
  const [file, setFile] = useState<File | null>(null);
  const [academicYearId, setAcademicYearId] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toDeleteId, setToDeleteId] = useState<string | null>(null);

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

  async function handleUpload(e: React.FormEvent) {
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

      alert(`Created ${json.createdCount} students; skipped ${json.skipped?.length ?? 0}`);
      setFile(null);
      (document.getElementById("csv-input") as HTMLInputElement | null)?.value && ((document.getElementById("csv-input") as HTMLInputElement).value = "");
      fetchStudents();
    } catch (err) {
      console.error(err);
      alert((err as Error).message || "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }

  function confirmDelete(id: string) {
    setToDeleteId(id);
    setConfirmOpen(true);
  }

  async function handleDelete(id: string | null) {
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
  }

  const [fromYearId, setFromYearId] = useState<string>("");
  const [toYearId, setToYearId] = useState<string>("");
  const [isPromoting, setIsPromoting] = useState(false);
  const [selectedYearId, setSelectedYearId] = useState<string>("");

  // Add single student modal state
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentEnroll, setNewStudentEnroll] = useState("");
  const [newStudentYear, setNewStudentYear] = useState("");
  const [isAddingStudent, setIsAddingStudent] = useState(false);

  async function handleAddStudent(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!newStudentName || !newStudentEnroll || !newStudentYear) return alert('Please fill all fields');
    setIsAddingStudent(true);
    try {
      const res = await fetch('/api/students', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fullName: newStudentName, enrollment: newStudentEnroll, academicYearId: newStudentYear }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to add student');
      toast.success('Student added');
      setIsAddStudentModalOpen(false);
      setNewStudentName(''); setNewStudentEnroll(''); setNewStudentYear('');
      fetchStudents();
    } catch (err) {
      console.error(err);
      toast.error((err as Error).message || 'Add failed');
    } finally {
      setIsAddingStudent(false);
    }
  }

  async function handlePromote(e: React.FormEvent) {
    e.preventDefault();
    if (!fromYearId || !toYearId) return alert("Please select both from and to academic years");
    if (fromYearId === toYearId) return alert("From and To must be different");
    setIsPromoting(true);
    try {
      const res = await fetch("/api/students/promote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fromYearId, toYearId }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Promote failed");
      alert(`Successfully promoted ${json.promoted ?? 0} students.`);
      fetchStudents();
    } catch (err) {
      console.error(err);
      alert((err as Error).message || "Promote failed");
    } finally {
      setIsPromoting(false);
    }
  }

  return (
    <main className="max-w-7xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Manage Students</h1>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="font-medium mb-2">Upload Students (CSV)</h2>
        <p className="text-sm text-gray-500 mb-4">Upload a CSV file with columns: enrollmentNumber, fullName, department</p>
        <div className="mb-4">
          <button type="button" onClick={() => setIsAddStudentModalOpen(true)} className="px-3 py-1 bg-green-600 text-white rounded">+ Add Single Student</button>
        </div>

        <form onSubmit={handleUpload} className="grid grid-cols-1 gap-3 max-w-md">
          <label className="text-sm font-medium">Academic Year</label>
          <select value={academicYearId} onChange={(e) => setAcademicYearId(e.target.value)} className="px-3 py-2 border rounded">
            <option value="">Select year</option>
            {years.map((y) => (
              <option key={y.id} value={y.id}>{y.abbreviation ?? y.name}</option>
            ))}
          </select>

          <label className="text-sm font-medium">CSV File</label>
          <div className="flex items-center gap-3">
            <label htmlFor="csv-input" className="px-3 py-2 bg-white border rounded cursor-pointer text-sm">
              Choose file
            </label>
            <input id="csv-input" type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="hidden" />
            <div className="text-sm text-gray-700">{file ? file.name : "No file selected"}</div>
          </div>

          <div>
            <button className="px-4 py-2 bg-blue-600 text-white rounded" disabled={isUploading} type="submit">
              {isUploading ? "Uploading..." : "Upload Students"}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6 ">
        <h2 className="font-medium mb-2">Promote Students</h2>
        <form onSubmit={handlePromote} className="flex flex-col gap-3">
          <div className="flex gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-sm">Promote from:</label>
              <select value={fromYearId} onChange={(e) => setFromYearId(e.target.value)} className="px-2 py-1 border rounded">
                <option value="">Select year</option>
                {years.map((y) => (
                  <option key={y.id} value={y.id}>{y.abbreviation ?? y.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm">Promote to:</label>
              <select value={toYearId} onChange={(e) => setToYearId(e.target.value)} className="px-2 py-1 border rounded">
                <option value="">Select year</option>
                {years.map((y) => (
                  <option key={y.id} value={y.id}>{y.abbreviation ?? y.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <button type="submit" className="px-3 py-1 bg-blue-700 text-white rounded hover:bg-blue-800 block" disabled={isPromoting}>{isPromoting ? "Promoting..." : "Promote All"}</button>
          </div>
        </form>
      </div>

      <div className="mb-4">
        <label className="text-sm font-medium mr-2">Filter by Year:</label>
        <select value={selectedYearId} onChange={(e) => setSelectedYearId(e.target.value)} className="px-2 py-1 border rounded">
          <option value="">All years</option>
          {years.map((y) => (
            <option key={y.id} value={y.id}>{y.abbreviation ?? y.name}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-gray-700">Name</th>
              <th className="px-6 py-3 text-left text-gray-700">Email (Enrollment No.)</th>
              <th className="px-6 py-3 text-left text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {(() => {
              const filteredStudents = selectedYearId ? students.filter((st) => st.academicYearId === selectedYearId) : students;
              return filteredStudents.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3">{s.name}</td>
                  <td className="px-6 py-3">{s.email}</td>
                  <td className="px-6 py-3">
                    <button onClick={() => handleDelete(s.id)} className="text-red-600 hover:underline">Delete</button>
                  </td>
                </tr>
              ));
            })()}
          </tbody>
        </table>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
          {/* overlay behind content; lower z so modal content stays on top */}
          <div className="absolute inset-0 bg-black/20 z-20" onClick={() => setIsAddStudentModalOpen(false)} />
          <div className="relative bg-white rounded p-6 z-30 w-full max-w-md shadow-lg" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-medium mb-3">Add Single Student</h3>
            <form onSubmit={handleAddStudent} className="space-y-3">
              <div>
                <label className="text-sm">Full Name</label>
                <input className="w-full border px-2 py-1 rounded" value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} />
              </div>
              <div>
                <label className="text-sm">Enrollment Number</label>
                <input className="w-full border px-2 py-1 rounded" value={newStudentEnroll} onChange={(e) => setNewStudentEnroll(e.target.value)} />
              </div>
              <div>
                <label className="text-sm">Academic Year</label>
                <select className="w-full border px-2 py-1 rounded" value={newStudentYear} onChange={(e) => setNewStudentYear(e.target.value)}>
                  <option value="">Select Year</option>
                  {years.map((y) => <option key={y.id} value={y.id}>{y.abbreviation ?? y.name}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-3 justify-end">
                <button type="button" onClick={() => setIsAddStudentModalOpen(false)} className="px-3 py-1 rounded border">Cancel</button>
                <button type="submit" disabled={isAddingStudent} className="px-3 py-1 bg-blue-600 text-white rounded">{isAddingStudent ? 'Adding...' : 'Add Student'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
