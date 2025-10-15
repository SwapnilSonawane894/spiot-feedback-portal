/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user?.role !== "HOD") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const staff = await prisma.staff.findUnique({ where: { userId: session.user.id } });
    if (!staff || !staff.departmentId) return NextResponse.json({ error: "HOD or department not found" }, { status: 404 });
    const departmentId = staff.departmentId;

    // Find assignments belonging to this department (include subject academicYear)
    const assignments = await prisma.facultyAssignment.findMany({
      where: { staff: { departmentId } },
      select: { id: true, semester: true, subject: { select: { academicYearId: true } } },
    });
    if (!assignments || assignments.length === 0) return NextResponse.json({ students: [] });

    // Determine the semester to consider: pick the most common or latest string (best-effort)
    const semesters = Array.from(new Set(assignments.map((a) => a.semester)));
    const semesterToUse = semesters.sort().reverse()[0];

    const semesterAssignments = assignments.filter((a) => a.semester === semesterToUse);
    // Determine available academic years present in these assignments
    const yearIds = Array.from(new Set(semesterAssignments.map((a) => a.subject?.academicYearId).filter(Boolean)));
    const academicYears = yearIds.length > 0 ? await prisma.academicYear.findMany({ where: { id: { in: yearIds } }, select: { id: true, name: true, abbreviation: true } }) : [];

    // Read optional yearId query param to filter subject assignments to a specific academic year
    const url = new URL(request.url);
    const yearId = url.searchParams.get('yearId');

    const filteredSemesterAssignments = yearId ? semesterAssignments.filter((a) => a.subject?.academicYearId === yearId) : semesterAssignments;
    const assignmentIds = filteredSemesterAssignments.map((a) => a.id);

    // Find students in department
    const students = await prisma.user.findMany({ where: { role: 'STUDENT', departmentId }, select: { id: true, name: true, email: true } });

    const results = [] as any[];
    for (const s of students) {
      const completed = await prisma.feedback.count({ where: { studentId: s.id, assignmentId: { in: assignmentIds } } });
      results.push({ name: s.name || s.email || 'Unknown', email: s.email || '', totalTasks: assignmentIds.length, completedTasks: completed });
    }

    return NextResponse.json({ semester: semesterToUse, academicYears, selectedYearId: yearId || null, students: results });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch submission status' }, { status: 500 });
  }
}
