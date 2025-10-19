import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user?.role !== "HOD") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const staff = await prisma.staff.findFirst({ where: { userId: session.user.id } });
    if (!staff) return NextResponse.json({ error: "HOD profile not found" }, { status: 404 });

    const departmentId = staff.departmentId;

    // OPTIMIZED: Single query with all includes - no N+1 problem
    const staffList = await prisma.staff.findMany({
      where: { departmentId },
      include: {
        user: true,
        assignments: {
          include: {
            subject: true,
            feedbacks: true,
          },
        },
      },
    });

    // Get total students count once (not inside loops!)
    const totalStudents = await prisma.user.count({
      where: { role: 'STUDENT', departmentId },
    });

    const reports = staffList.map((s) => {
      const staffReports = s.assignments.map((a) => {
        const feedbacks = a.feedbacks;
        
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
          subject: a.subject,
          averages: avg,
          submissionCount: feedbacks.length,
          totalResponses: feedbacks.length,
          totalStudents,
          isReleased: feedbacks.every((ff: any) => ff.isReleased),
        };
      }).filter(Boolean); // Remove null entries

      return {
        staffId: s.id,
        staffName: s.user?.name ?? s.user?.email ?? "Unknown",
        reports: staffReports,
      };
    });

    return NextResponse.json({ reports });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
  }
}
