/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { staffService, assignmentService, subjectService, departmentSubjectsService } from "@/lib/mongodb-services";

const CURRENT_SEMESTER = "Odd 2025-26";

export async function GET() {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = session.user?.role;

    if (role === "HOD") {
      const hodProfile = await staffService.findUnique({ where: { userId: session.user.id } });
      if (!hodProfile) return NextResponse.json({ error: "HOD profile not found" }, { status: 404 });

    // Get all subjects for this HOD's department via departmentSubjects junction
  const deptSubjects = await departmentSubjectsService.findSubjectsForDepartment(hodProfile.departmentId);
    const subjectIds = (deptSubjects || []).map((s: any) => s.id);

  // Get all assignments for these subjects for the current semester (scope to subjectIds)
  const allAssignments = await assignmentService.findMany({ where: { semester: CURRENT_SEMESTER, subjectId: subjectIds }, include: { subject: true, feedbacks: true } });
  const assignments = allAssignments; // already filtered by subjectId

      // Fetch staff for assignments when possible
  const staffIds = Array.from(new Set(assignments.map((a: any) => a.staffId).filter(Boolean)));
  const staffList = staffIds.length ? await staffService.findMany({ where: { id: staffIds }, include: { user: true } }) : [];

      const assignmentsWithStaff = assignments.map((a: any) => ({
        ...a,
        staff: staffList.find((s: any) => s.id === a.staffId) || null,
      }));

  const reports = assignmentsWithStaff.map((a: any) => {
        const averages: any = {};
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

        for (const p of params) {
          const vals = a.feedbacks.map((f: any) => f[p]).filter((v: any) => typeof v === 'number');
          const avg = vals.length ? vals.reduce((s: number, x: number) => s + x, 0) / vals.length : 0;
          averages[p] = Number(avg.toFixed(2));
        }

        return {
          facultyName: a.staff?.user?.name || a.staff?.user?.email || 'Unknown',
          subjectName: a.subject?.name,
          assignmentId: a.id,
          averages,
        };
      });

      return NextResponse.json(reports);
    }

    if (role === "HOD" || role === "ADMIN") {
      // handled above
    }

    if (role) {
      // assume staff
      const staff = await staffService.findUnique({ where: { userId: session.user.id }, include: { user: true } });
      if (!staff) return NextResponse.json({ error: "Staff profile not found" }, { status: 404 });

      const assignments = await assignmentService.findMany({ where: { semester: CURRENT_SEMESTER, staffId: staff.id }, include: { subject: true, feedbacks: true } });
      const assignmentsWithStaff = assignments.map(a => ({ ...a, staff }));

      const reports = assignmentsWithStaff.map((a: any) => {
        const averages: any = {};
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

        for (const p of params) {
          const vals = a.feedbacks.map((f: any) => f[p]).filter((v: any) => typeof v === 'number');
          const avg = vals.length ? vals.reduce((s: number, x: number) => s + x, 0) / vals.length : 0;
          averages[p] = Number(avg.toFixed(2));
        }

        return {
          facultyName: a.staff?.user?.name || a.staff?.user?.email,
          subjectName: a.subject?.name,
          assignmentId: a.id,
          averages,
        };
      });

      return NextResponse.json(reports);
    }

    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  } catch (error) {
    // console.error(error);
    return NextResponse.json({ error: "Failed to compute reports" }, { status: 500 });
  }
}
