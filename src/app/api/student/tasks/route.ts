/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import type { Session } from "next-auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = (await getServerSession(authOptions as any)) as Session | null;
    if (!session || session.user?.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id as string;

    // Load student with academicYearId
    const student = await prisma.user.findUnique({ where: { id: userId } });
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    const academicYearId = (student as unknown as { academicYearId?: string })?.academicYearId;
    if (!academicYearId) {
      return NextResponse.json({ error: "Student academic year not set" }, { status: 400 });
    }

    // CRITICAL CHECK: ensure department feedback window is active
    const department = await prisma.department.findUnique({ where: { id: student.departmentId as any } });
    if (!department) return NextResponse.json({ error: "Student department not found" }, { status: 404 });
    // department.isFeedbackActive may not yet be in generated types; cast to any
    if (!((department as any).isFeedbackActive)) {
      return NextResponse.json([]);
    }

    // Find all assignments where subject.academicYearId == student's academicYearId
    const assignments = await (prisma as any).facultyAssignment.findMany({
      where: { subject: { academicYearId } },
      include: { staff: { include: { user: true } }, subject: true },
      orderBy: { id: "asc" },
    });

    const tasks = await Promise.all(
      assignments.map(async (a: any) => {
        const existing = await (prisma as any).feedback.findFirst({ where: { assignmentId: a.id, studentId: userId } });
        return {
          assignmentId: a.id,
          facultyName: a.staff?.user?.name ?? a.staff?.user?.email ?? "Unnamed",
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
