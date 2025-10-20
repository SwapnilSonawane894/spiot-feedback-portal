"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardList, CheckCircle2, FileText } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { SkeletonTaskCard } from "@/components/skeletons";

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

  if (loading) {
    return (
      <div>
        <PageHeader 
          title="My Feedback Tasks" 
          description="Odd Semester 2025-26" 
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          <SkeletonTaskCard />
          <SkeletonTaskCard />
          <SkeletonTaskCard />
          <SkeletonTaskCard />
          <SkeletonTaskCard />
          <SkeletonTaskCard />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader 
        title="My Feedback Tasks" 
        description="Odd Semester 2025-26" 
      />

      {error ? (
        <div className="card content-spacing">
          <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
            <div className="flex-shrink-0">⚠</div>
            <div>{error}</div>
          </div>
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={<ClipboardList size={48} />}
          title="No feedback tasks"
          description="You have no pending feedback tasks at the moment. Check back later when tasks are assigned."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {tasks.map((t) => (
            <article key={t.assignmentId} className="card content-spacing flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg" style={{ background: "var(--primary-light)" }}>
                  <FileText size={20} style={{ color: "var(--primary)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>
                    Faculty
                  </div>
                  <div className="font-semibold text-base truncate" style={{ color: "var(--text-primary)" }}>
                    {t.facultyName}
                  </div>
                </div>
              </div>

              <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
                Subject: <span className="font-medium" style={{ color: "var(--text-primary)" }}>{t.subjectName}</span>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-auto pt-3 border-t" style={{ borderColor: "var(--card-border)" }}>
                {t.status === "Pending" ? (
                  <Link
                    href={`/student/feedback/${t.assignmentId}`}
                    className="btn-primary w-full sm:w-auto"
                  >
                    Start Feedback
                  </Link>
                ) : (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400">
                    <CheckCircle2 size={16} />
                    <span className="text-sm font-medium">Completed</span>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
