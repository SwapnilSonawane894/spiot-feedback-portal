import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user?.role !== "HOD") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // get hod's department
    const staff = await prisma.staff.findFirst({ where: { userId: session.user.id } });
    if (!staff) return NextResponse.json({ error: "HOD profile not found" }, { status: 404 });

    const departmentId = staff.departmentId;

    // fetch staff in department
    const staffList = await prisma.staff.findMany({ where: { departmentId }, include: { user: true } });

    const reports = [] as any[];

    for (const s of staffList) {
      // find assignments for staff
      const assignments = await prisma.facultyAssignment.findMany({ where: { staffId: s.id }, include: { subject: true } });
      const staffReports: any[] = [];

      for (const a of assignments) {
        const feedbacks = await prisma.feedback.findMany({ where: { assignmentId: a.id } });
        if (!feedbacks || feedbacks.length === 0) continue;

  // compute averages for 16 params
        const avg = {
          coverage_of_syllabus: 0,
          covering_relevant_topics_beyond_syllabus: 0,
          effectiveness_technical_contents: 0,
          effectiveness_communication_skills: 0,
          effectiveness_teaching_aids: 0,
          motivation_self_learning: 0,
          support_practical_performance: 0,
          support_project_seminar: 0,
          feedback_on_student_progress: 0,
          punctuality_and_discipline: 0,
          domain_knowledge: 0,
          interaction_with_students: 0,
          ability_to_resolve_difficulties: 0,
          encourage_cocurricular: 0,
          encourage_extracurricular: 0,
          guidance_during_internship: 0,
        } as any;

        for (const f of feedbacks) {
          Object.keys(avg).forEach((k) => {
            avg[k] += (f as any)[k] ?? 0;
          });
        }
        Object.keys(avg).forEach((k) => {
          avg[k] = parseFloat((avg[k] / feedbacks.length).toFixed(2));
        });

    // count students in department (total eligible students)
    const totalStudents = await prisma.user.count({ where: { role: 'STUDENT', departmentId } });

  staffReports.push({ assignmentId: a.id, semester: a.semester, subject: a.subject, averages: avg, submissionCount: feedbacks.length, totalResponses: feedbacks.length, totalStudents, isReleased: feedbacks.every((ff) => (ff as any).isReleased) });
      }

      reports.push({ staffId: s.id, staffName: s.user?.name ?? s.user?.email ?? "Unknown", reports: staffReports });
    }

    return NextResponse.json({ reports });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
  }
}
