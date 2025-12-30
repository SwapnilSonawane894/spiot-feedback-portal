import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { staffService, assignmentService, hodSuggestionService, subjectService, feedbackService } from "@/lib/mongodb-services";

export async function GET() {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Accept both STAFF and FACULTY roles (some accounts use FACULTY string)
  if (session.user?.role !== "STAFF" && session.user?.role !== "HOD" && session.user?.role !== "FACULTY") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const staff = await staffService.findFirst({ where: { userId: session.user.id } });
    if (!staff) {
      // Provide additional debug info in development to help tracing missing staff profiles
      if (process.env.NODE_ENV !== 'production') {
        const staffRows = await staffService.findMany({ where: { userId: session.user.id } });
        return NextResponse.json({ error: "Staff profile not found", debug: { sessionUserId: session.user.id, staffRows } }, { status: 404 });
      }
      return NextResponse.json({ error: "Staff profile not found" }, { status: 404 });
    }
  // Limit assignments to those that belong to the staff's department
  const assignments = await assignmentService.findMany({ where: { staffId: staff.id, departmentId: staff.departmentId } });

    // Batch fetch subjects and feedbacks for these assignments
    const assignmentIds = assignments.map((a: any) => a.id);
    const uniqueSubjectIds = Array.from(new Set(assignments.map((a: any) => a.subjectId).filter(Boolean)));
    const subjects = await Promise.all(uniqueSubjectIds.map((id: any) => subjectService.findUnique({ id })));
    const subjectMap = new Map(subjects.filter(Boolean).map((s: any) => [s.id, s]));
    const feedbacks = assignmentIds.length > 0 ? await feedbackService.findMany({ where: { assignmentId: { $in: assignmentIds } } }) : [];
    const feedbackMap = new Map<string, any[]>();
    for (const f of feedbacks) {
      if (!feedbackMap.has(f.assignmentId)) feedbackMap.set(f.assignmentId, []);
      feedbackMap.get(f.assignmentId)!.push(f);
    }

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
    // Student suggestions are now only visible to HOD, not faculty

    for (const a of assignments) {
      let fb = feedbackMap.get(a.id) || [];
      // If the viewer is not an HOD, only include feedbacks that have been released by HOD
      const viewerIsHod = session.user?.role === 'HOD';
      if (!viewerIsHod) fb = fb.filter((f: any) => f.isReleased === true);

      if (!fb || fb.length === 0) continue;

      const avg: any = {};
      params.forEach((p) => (avg[p] = 0));
      for (const f of fb) {
        params.forEach((p) => (avg[p] += Number((f as any)[p] ?? 0)));
        // Student suggestions are no longer collected for faculty view
      }
      params.forEach((p) => (avg[p] = parseFloat((avg[p] / fb.length).toFixed(2))));

      // overall performance percentage
      const total = params.reduce((s, k) => s + (Number(avg[k]) || 0), 0);
      const overallPercentage = parseFloat(((total / (params.length * 5)) * 100).toFixed(2));

      reports.push({ assignmentId: a.id, subject: subjectMap.get(a.subjectId), semester: a.semester, averages: avg, totalResponses: fb.length, overallPercentage });
    }

  // include staffId (inferred from session) so client can request the PDF
  const staffProfile = await staffService.findFirst({ where: { userId: session.user.id } });

  // return single HOD suggestion for the current semester (best-effort)
  const semester = reports?.[0]?.semester || '';
  let hodSuggestion = '';
  if (staffProfile?.id && semester) {
    const rows = await hodSuggestionService.findMany({ where: { staffId: staffProfile.id, semester } });
    hodSuggestion = rows && rows.length > 0 ? rows[0].content || '' : '';
  }

  // Student suggestions removed from faculty response - only HOD can see them
  return NextResponse.json({ facultyName, academicYear, reports, staffId: staffProfile?.id, hodSuggestion });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch faculty report" }, { status: 500 });
  }
}
