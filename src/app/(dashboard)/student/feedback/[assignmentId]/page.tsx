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

function Stars({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1" role="radiogroup">
      {Array.from({ length: 5 }).map((_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i + 1)}
          className={`text-2xl ${i < value ? "text-yellow-500" : "text-gray-300"}`}
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
      console.error(err);
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
      console.log("Feedback submit response", res.status, json);
      if (!res.ok) throw new Error(json?.error || "Failed to submit");
      toast.success("Feedback submitted");
      router.push("/student/dashboard");
    } catch (err) {
      console.error(err);
      toast.error((err as Error).message || "Submit failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-2">Feedback Form</h1>
      <div className="mb-6 text-sm text-gray-600">Assignment: {assignmentId}</div>

      {error && <div className="mb-4 text-sm text-red-600">{error}</div>}

      {info && (
        <div className="mb-6">
          <div className="font-medium">Faculty: {info.facultyName}</div>
          <div className="text-sm text-gray-500">Subject: {info.subjectName}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {feedbackParameters.map((p) => (
          <div key={p.key} className="flex items-center justify-between bg-white p-4 rounded shadow">
            <div className="">{p.label}</div>
            <Stars value={ratings[p.key]} onChange={(v) => setRating(p.key, v)} />
          </div>
        ))}

        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-medium mb-2">Any Suggestion (applicable)</h3>
          <textarea
            value={anySuggestion}
            onChange={(e) => setAnySuggestion(e.target.value)}
            className="w-full border rounded p-2 min-h-[100px]"
            placeholder="Optional: add any comments or suggestions for the faculty..."
          />
        </div>

        <div className="pt-4">
          <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded">
            {isSubmitting ? "Submitting..." : "Submit Feedback"}
          </button>
        </div>
      </form>
    </main>
  );
}
