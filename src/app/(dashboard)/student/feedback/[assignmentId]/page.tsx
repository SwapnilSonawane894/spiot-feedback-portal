"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";

type AssignmentInfo = { facultyName: string; subjectName: string };

const feedbackParameters: { key: string; label: string }[] = [
  { key: "coverage_of_syllabus", label: "Coverage of syllabus" },
  { key: "covering_relevant_topics_beyond_syllabus", label: "Covering relevant topics beyond the syllabus" },
  { key: "effectiveness_technical_contents", label: "Effectiveness in terms of technical contents/ course contents" },
  { key: "effectiveness_communication_skills", label: "Effectiveness in terms of communication skills" },
  { key: "effectiveness_teaching_aids", label: "Effectiveness in terms of teaching aids" },
  { key: "motivation_self_learning", label: "Motivation and inspiration for students to learn in self-learning mode" },
  { key: "support_practical_performance", label: "Support for development of student skills: practical performance" },
  { key: "support_project_seminar", label: "Support for development of student skills: project and seminar preparation" },
  { key: "feedback_on_student_progress", label: "Feedback provided on student progress" },
  { key: "punctuality_and_discipline", label: "Punctuality and discipline" },
  { key: "domain_knowledge", label: "Domain knowledge" },
  { key: "interaction_with_students", label: "Interaction with students" },
  { key: "ability_to_resolve_difficulties", label: "Ability to resolve difficulties" },
  { key: "encourage_cocurricular", label: "Encourage to participate in cocurricular activities" },
  { key: "encourage_extracurricular", label: "Encourage to participate in extracurricular activities" },
  { key: "guidance_during_internship", label: "Guidance during internship" },
];

const PARAMETERS = feedbackParameters.map((p) => p.key);

// Helper to strip emojis from text (PDF generation cannot handle them)
function stripEmojis(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // Emojis and symbols
    .replace(/[\u{2600}-\u{26FF}]/gu, '')   // Miscellaneous symbols
    .replace(/[\u{2700}-\u{27BF}]/gu, '')   // Dingbats
    .replace(/[\u{1F000}-\u{1F02F}]/gu, '') // Mahjong tiles
    .replace(/[\u{1F0A0}-\u{1F0FF}]/gu, '') // Playing cards
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '')   // Variation selectors
    .replace(/[\u{200D}]/gu, '')            // Zero width joiner
    .replace(/[^\x00-\xFF]/g, '')           // Remove any remaining non-Latin1 characters
    .trim();
}

function Stars({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-2" role="radiogroup">
      {Array.from({ length: 5 }).map((_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i + 1)}
          className={`text-3xl transition-all duration-200 ${i < value ? "text-yellow-500 scale-110" : "text-gray-300 hover:text-yellow-300 hover:scale-105"}`}
          style={{ 
            filter: i < value ? "drop-shadow(0 2px 4px rgba(234, 179, 8, 0.3))" : "none"
          }}
          aria-label={`${i + 1} star`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function FeedbackForm(): React.ReactElement {
  const params = useParams() as { assignmentId?: string };
  const router = useRouter();
  const assignmentId = params.assignmentId as string | undefined;

  const [info, setInfo] = useState<AssignmentInfo | null>(null);
  const [ratings, setRatings] = useState<Record<string, number>>(() => Object.fromEntries(PARAMETERS.map((p) => [p, 0])));
  const [anySuggestion, setAnySuggestion] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (assignmentId) {
      fetchInfo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentId]);

  async function fetchInfo() {
    try {
      const res = await fetch(`/api/student/tasks`);
      if (!res.ok) throw new Error("Failed to fetch assignment info");
      const data = (await res.json()) as { assignmentId: string; facultyName: string; subjectName: string }[];
      const found = data.find((a) => a.assignmentId === assignmentId);
      if (!found) {
        toast.error("Assignment not found");
        return;
      }
      setInfo({ facultyName: found.facultyName, subjectName: found.subjectName });
    } catch (err) {
      // console.error(err);
      toast.error("Failed to load assignment info");
    }
  }

  function setRating(param: string, value: number) {
    setRatings((r) => ({ ...r, [param]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Validation: ensure all 16 mandatory parameters have values > 0
    const missing = PARAMETERS.filter((k) => !ratings[k] || ratings[k] <= 0);
    if (missing.length > 0) {
      setError("Please rate all 16 parameters before submitting.");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId, ratings, any_suggestion: anySuggestion }),
      });
      const json = await res.json().catch(() => null);
      // console.log("Feedback submit response", res.status, json);
      if (!res.ok) throw new Error(json?.error || "Failed to submit");
      toast.success("Feedback submitted");
      router.push("/student/dashboard");
    } catch (err) {
      // console.error(err);
      toast.error((err as Error).message || "Submit failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="max-w-3xl mx-auto">
      <div className="page-header">
        <h1 className="page-title">Feedback Form</h1>
        <p className="page-description">Rate your faculty on the following parameters</p>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 rounded-lg text-sm font-medium" style={{ background: "var(--danger-light)", color: "var(--danger)" }}>
          {error}
        </div>
      )}

      {info && (
        <div className="card card-body mb-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium px-2 py-1 rounded" style={{ background: "var(--primary-light)", color: "var(--primary)" }}>Faculty</span>
              <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{info.facultyName}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium px-2 py-1 rounded" style={{ background: "var(--secondary)", color: "white" }}>Subject</span>
              <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{info.subjectName}</span>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {feedbackParameters.map((p) => (
          <div key={p.key} className="card card-body space-y-3">
            <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{p.label}</div>
            <Stars value={ratings[p.key]} onChange={(v) => setRating(p.key, v)} />
          </div>
        ))}

        <div className="card card-body">
          <label className="form-label">Any Suggestions (Optional)</label>
          <textarea
            value={anySuggestion}
            onChange={(e) => {
              // Strip emojis as user types to prevent PDF generation issues
              const sanitized = stripEmojis(e.target.value);
              setAnySuggestion(sanitized);
            }}
            className="input-field min-h-[100px] resize-none"
            placeholder="Optional: add any comments or suggestions for the faculty (emojis not allowed)..."
          />
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Note: Emojis and special characters are not allowed.</p>
        </div>

        <div className="pt-4 flex gap-3">
          <button 
            type="submit" 
            disabled={isSubmitting} 
            className="btn-primary w-full sm:w-auto"
          >
            {isSubmitting ? "Submitting..." : "Submit Feedback"}
          </button>
          <button 
            type="button" 
            onClick={() => router.push("/student/dashboard")}
            className="btn-outline w-full sm:w-auto"
          >
            Cancel
          </button>
        </div>
      </form>
    </main>
  );
}
