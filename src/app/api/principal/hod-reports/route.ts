import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { staffService, userService, assignmentService, subjectService, feedbackService, departmentService, normalizeSemester } from "@/lib/mongodb-services";

const PARAM_KEYS = [
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

export async function GET(req: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user?.role !== "PRINCIPAL") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(req.url);
    const filterSemester = url.searchParams.get("semester");
    const targetSemester = filterSemester ? normalizeSemester(filterSemester) : null;

    const hodUsers = await userService.findMany({ where: { role: "HOD" } });

    const hods = await Promise.all(
      hodUsers.map(async (hodUser: any) => {
        try {
          const staff = await staffService.findFirst({ where: { userId: hodUser.id } });
          if (!staff) return null;

          const dept = await departmentService.findUnique({ id: staff.departmentId });

          let assignments = await assignmentService.findMany({ where: { staffId: staff.id } });

          if (targetSemester) {
            assignments = assignments.filter(
              (a: any) => normalizeSemester(a.semester || "") === targetSemester
            );
          }

          const reports = await Promise.all(
            assignments.map(async (a: any) => {
              try {
                const subject = await subjectService.findUnique({ id: a.subjectId });
                const feedbacks = await feedbackService.findMany({ where: { assignmentId: a.id } });

                if (!feedbacks || feedbacks.length === 0) return null;

                const avg: any = {};
                PARAM_KEYS.forEach((p) => { avg[p] = 0; });
                feedbacks.forEach((f: any) => {
                  PARAM_KEYS.forEach((p) => { avg[p] += Number(f[p] ?? 0); });
                });
                PARAM_KEYS.forEach((p) => {
                  avg[p] = parseFloat((avg[p] / feedbacks.length).toFixed(2));
                });

                const total = PARAM_KEYS.reduce((s, k) => s + (Number(avg[k]) || 0), 0);
                const overallPercentage = parseFloat(((total / (PARAM_KEYS.length * 5)) * 100).toFixed(2));

                return {
                  assignmentId: a.id,
                  semester: normalizeSemester(a.semester || ""),
                  subject,
                  averages: avg,
                  totalResponses: feedbacks.length,
                  overallPercentage,
                };
              } catch {
                return null;
              }
            })
          );

          const validReports = reports.filter(Boolean);

          return {
            hodStaffId: staff.id,
            hodUserId: hodUser.id,
            hodName: hodUser.name || hodUser.email || "Unknown",
            departmentName: dept?.name || "Unknown Department",
            departmentAbbreviation: (dept as any)?.abbreviation || "",
            departmentId: staff.departmentId,
            reports: validReports,
          };
        } catch {
          return null;
        }
      })
    );

    const validHods = hods
      .filter(Boolean)
      .filter((h: any) => h.reports && h.reports.length > 0);

    return NextResponse.json({ hods: validHods });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch HOD reports" }, { status: 500 });
  }
}
