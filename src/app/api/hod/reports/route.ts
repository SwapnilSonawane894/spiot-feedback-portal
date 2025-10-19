import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { staffService, userService, assignmentService, subjectService, feedbackService } from "@/lib/firebase-services";

export async function GET() {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user?.role !== "HOD") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const staff = await staffService.findFirst({ where: { userId: session.user.id } });
    if (!staff) return NextResponse.json({ error: "HOD profile not found" }, { status: 404 });

    const departmentId = staff.departmentId;

    // Get staff list with user data and assignments
    const staffList = await staffService.findMany({
      where: { departmentId },
    });

    // Get total students count once (not inside loops!)
    const totalStudents = await userService.count({ role: 'STUDENT', departmentId });

    const reports = await Promise.all(staffList.map(async (s: any) => {
      // Fetch user and assignments for this staff member
      const user = await userService.findUnique({ id: s.userId });
      const assignments = await assignmentService.findMany({ where: { staffId: s.id } });
      
      const staffReports = await Promise.all(assignments.map(async (a: any) => {
        // Fetch subject and feedbacks for this assignment
        const subject = await subjectService.findUnique({ id: a.subjectId });
        const feedbacks = await feedbackService.findMany({ where: { assignmentId: a.id } });
        
        if (!feedbacks || feedbacks.length === 0) {
          return null; // Skip assignments with no feedback
        }

        // Compute averages for 16 params
        const paramKeys = [
          'coverage_of_syllabus',
          'covering_relevant_topics_beyond_syllabus',
          'effectiveness_technical_contents',
          'effectiveness_communication_skills',
          'effectiveness_teaching_aids',
          'motivation_self_learning',
          'support_practical_performance',
          'support_project_seminar',
          'feedback_on_student_progress',
          'punctuality_and_discipline',
          'domain_knowledge',
          'interaction_with_students',
          'ability_to_resolve_difficulties',
          'encourage_cocurricular',
          'encourage_extracurricular',
          'guidance_during_internship',
        ];

        const avg: any = {};
        paramKeys.forEach((k) => {
          avg[k] = 0;
        });

        feedbacks.forEach((f: any) => {
          paramKeys.forEach((k) => {
            avg[k] += f[k] ?? 0;
          });
        });

        paramKeys.forEach((k) => {
          avg[k] = parseFloat((avg[k] / feedbacks.length).toFixed(2));
        });

        return {
          assignmentId: a.id,
          semester: a.semester,
          subject: subject,
          averages: avg,
          submissionCount: feedbacks.length,
          totalResponses: feedbacks.length,
          totalStudents,
          isReleased: feedbacks.every((ff: any) => ff.isReleased),
        };
      }));
      
      const validReports = staffReports.filter(Boolean); // Remove null entries

      return {
        staffId: s.id,
        staffName: user?.name ?? user?.email ?? "Unknown",
        reports: validReports,
      };
    }));

    return NextResponse.json({ reports });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
  }
}
