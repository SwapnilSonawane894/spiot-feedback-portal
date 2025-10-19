import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { staffService, assignmentService, hodSuggestionService } from "@/lib/firebase-services";

export async function GET() {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user?.role !== "STAFF" && session.user?.role !== "HOD") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const staff = await staffService.findFirst({ where: { userId: session.user.id } });
    if (!staff) return NextResponse.json({ error: "Staff profile not found" }, { status: 404 });
    const assignments = await assignmentService.findMany({ where: { staffId: staff.id }, include: { subject: true, feedbacks: true } });

    const params = [
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

    // Determine facultyName and academicYear (best-effort: infer from subjects' academic years)
    const facultyName = session.user?.name || session.user?.email || "Unknown";
    const academicYear = assignments.length > 0 ? (assignments[0].subject?.academicYearId ?? null) : null;

    const reports: any[] = [];
    const suggestions: string[] = [];

    for (const a of assignments) {
      const feedbacks = (a as any).feedbacks || [];
      if (!feedbacks || feedbacks.length === 0) continue;

      const avg: any = {};
      params.forEach((p) => (avg[p] = 0));
      for (const f of feedbacks) {
        params.forEach((p) => (avg[p] += Number((f as any)[p] ?? 0)));
        const text = (f as any).any_suggestion;
        if (text && typeof text === 'string' && text.trim().length > 0) suggestions.push(text.trim());
      }
      params.forEach((p) => (avg[p] = parseFloat((avg[p] / feedbacks.length).toFixed(2))));

      // overall performance percentage
      const total = params.reduce((s, k) => s + (Number(avg[k]) || 0), 0);
      const overallPercentage = parseFloat(((total / (params.length * 5)) * 100).toFixed(2));

      reports.push({ assignmentId: a.id, subject: a.subject, semester: a.semester, averages: avg, totalResponses: feedbacks.length, overallPercentage });
    }

  // include staffId (inferred from session) so client can request the PDF
  const staffProfile = await staffService.findFirst({ where: { userId: session.user.id } });

  // return single HOD suggestion for the current semester (best-effort)
  const semester = reports?.[0]?.semester || '';
  let hodSuggestion = '';
  if (staffProfile?.id && semester) {
    const row = await hodSuggestionService.findUnique({ staffId_semester: { staffId: staffProfile.id, semester } });
    hodSuggestion = row?.content || '';
  }

  return NextResponse.json({ facultyName, academicYear, reports, suggestions, staffId: staffProfile?.id, hodSuggestion });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch faculty report" }, { status: 500 });
  }
}
