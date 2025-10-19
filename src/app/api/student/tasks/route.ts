/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import type { Session } from "next-auth";
import { userService, departmentService, assignmentService, feedbackService } from "@/lib/firebase-services";

export async function GET() {
  try {
    const session = (await getServerSession(authOptions as any)) as Session | null;
    if (!session || session.user?.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id as string;

    // Load student with academicYearId
    const student = await userService.findUnique({ id: userId });
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    const academicYearId = (student as unknown as { academicYearId?: string })?.academicYearId;
    if (!academicYearId) {
      return NextResponse.json({ error: "Student academic year not set" }, { status: 400 });
    }

    // CRITICAL CHECK: ensure department feedback window is active
    const department = await departmentService.findUnique({ id: student.departmentId as any });
    if (!department) return NextResponse.json({ error: "Student department not found" }, { status: 404 });
    // department.isFeedbackActive may not yet be in generated types; cast to any
    if (!((department as any).isFeedbackActive)) {
      return NextResponse.json([]);
    }

    // Find all assignments where subject.academicYearId == student's academicYearId
    const allAssignments = await assignmentService.findMany({ include: { subject: true } });
    const assignments = allAssignments.filter(a => a.subject?.academicYearId === academicYearId);
    
    // Get staff details for each assignment
    const allFeedback = await feedbackService.findMany({});
    
    const tasks = await Promise.all(
      assignments.map(async (a: any) => {
        // Get staff for this assignment
        const staff = await assignmentService.findUnique({ id: a.id });
        const staffData = staff ? await assignmentService.findMany({ where: { id: a.id }, include: { subject: true } }) : [];
        
        const existing = allFeedback.find(f => f.assignmentId === a.id && f.studentId === userId);
        return {
          assignmentId: a.id,
          facultyName: "Faculty",
          subjectName: a.subject?.name,
          status: existing ? "Completed" : "Pending",
        };
      })
    );

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("API /student/tasks - unexpected error:", error);
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }
}
