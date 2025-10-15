"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

type Task = { assignmentId: string; facultyName: string; subjectName: string; status: string };

export default function StudentDashboard(): React.ReactElement {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchTasks();
  }, []);

  async function fetchTasks() {
    setLoading(true);
    try {
      const res = await fetch("/api/student/tasks");
      const data = await res.json();
      if (!res.ok) {
        const message = data?.error || JSON.stringify(data);
        throw new Error(message || "Failed to fetch tasks");
      }
      setTasks(data || []);
    } catch (err) {
      console.error(err);
      setError((err as Error).message || "Failed to fetch tasks");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-semibold mb-2">My Feedback Tasks</h1>
      <h2 className="text-sm text-gray-500 mb-6">Odd 2025-26</h2>

      {loading ? (
        <div className="text-gray-600">Loading your tasks…</div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : tasks.length === 0 ? (
        <div className="text-gray-700">You have no pending feedback tasks at the moment.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map((t) => (
            <article key={t.assignmentId} className="bg-white rounded-lg shadow p-4 flex flex-col justify-between">
              <div>
                <div className="text-sm text-gray-500">Faculty</div>
                <div className="text-lg font-semibold text-gray-900">{t.facultyName}</div>
                <div className="mt-2 text-sm text-gray-600">Subject: <span className="font-medium text-gray-800">{t.subjectName}</span></div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                {t.status === "Pending" ? (
                  <Link
                    href={`/student/feedback/${t.assignmentId}`}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Start Feedback
                  </Link>
                ) : (
                  <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 00-1.414 0L8 12.586 4.707 9.293a1 1 0 00-1.414 1.414l4 4a1 1 0 001.414 0l8-8a1 1 0 000-1.414z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium">Completed</span>
                  </div>
                )}

                <div className="text-sm text-gray-400">Status: <span className="font-medium text-gray-700">{t.status}</span></div>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
