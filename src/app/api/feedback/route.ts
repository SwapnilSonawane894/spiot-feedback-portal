/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { feedbackService } from "@/lib/mongodb-services";

// Helper to strip emojis from text to ensure PDF compatibility
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

export async function GET() {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session || !["ADMIN", "HOD", "STAFF"].includes(session.user?.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const feedback = await feedbackService.findMany({});
    return NextResponse.json(feedback);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch feedback" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session || session.user?.role !== "STUDENT") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = session.user.id as string;
  const body = await request.json();
  const { assignmentId, ratings, any_suggestion } = body || {};

    if (!assignmentId || !ratings) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const required = [
      "coverage_of_syllabus",
      "covering_relevant_topics_beyond_syllabus",
      "effectiveness_technical_contents",
      "effectiveness_communication_skills",
      "effectiveness_teaching_aids",
      "motivation_self_learning",
      "support_practical_performance",
      "support_project_seminar",
      "feedback_on_student_progress",
      "punctuality_and_discipline",
      "domain_knowledge",
      "interaction_with_students",
      "ability_to_resolve_difficulties",
      "encourage_cocurricular",
      "encourage_extracurricular",
      "guidance_during_internship",
    ];

    for (const k of required) {
      if (typeof ratings[k] !== "number") return NextResponse.json({ error: `Missing rating for ${k}` }, { status: 400 });
    }

    const existing = await feedbackService.findFirst({ assignmentId, studentId: userId });
    if (existing) return NextResponse.json({ error: "Feedback already submitted" }, { status: 409 });

    await feedbackService.create({
      studentId: userId,
      assignmentId,
      coverage_of_syllabus: ratings.coverage_of_syllabus,
      covering_relevant_topics_beyond_syllabus: ratings.covering_relevant_topics_beyond_syllabus,
      effectiveness_technical_contents: ratings.effectiveness_technical_contents,
      effectiveness_communication_skills: ratings.effectiveness_communication_skills,
      effectiveness_teaching_aids: ratings.effectiveness_teaching_aids,
      motivation_self_learning: ratings.motivation_self_learning,
      support_practical_performance: ratings.support_practical_performance,
      support_project_seminar: ratings.support_project_seminar,
      feedback_on_student_progress: ratings.feedback_on_student_progress,
      punctuality_and_discipline: ratings.punctuality_and_discipline,
      domain_knowledge: ratings.domain_knowledge,
      interaction_with_students: ratings.interaction_with_students,
      ability_to_resolve_difficulties: ratings.ability_to_resolve_difficulties,
      encourage_cocurricular: ratings.encourage_cocurricular,
      encourage_extracurricular: ratings.encourage_extracurricular,
      guidance_during_internship: ratings.guidance_during_internship,
      any_suggestion: typeof any_suggestion === 'string' && any_suggestion.trim().length > 0 ? stripEmojis(any_suggestion) || null : null,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to save feedback" }, { status: 500 });
  }
}
