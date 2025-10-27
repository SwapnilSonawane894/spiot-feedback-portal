/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import type { Session } from "next-auth";
import { userService, departmentService, departmentSubjectsService, assignmentService, feedbackService, staffService, normalizeSemester } from "@/lib/mongodb-services";

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

    // DEBUG: student info
    try {
      console.log('🔍 STUDENT TASKS DEBUG:');
      console.log(`  Student ID: ${student.id}`);
      console.log(`  Department ID: ${student.departmentId}`);
      console.log(`  Academic Year ID: ${academicYearId}`);
      console.log(`  Semester: ${student.semester}`);
    } catch (e) {
      console.log('🔍 STUDENT TASKS DEBUG: failed to stringify student info', e);
    }

    // CRITICAL CHECK: ensure department feedback window is active
    const department = await departmentService.findUnique({ id: student.departmentId as any });
    if (!department) return NextResponse.json({ error: "Student department not found" }, { status: 404 });
    // department.isFeedbackActive may not yet be in generated types; cast to any
    if (!((department as any).isFeedbackActive)) {
      return NextResponse.json([]);
    }

  // Find departmentSubjects (junctions + master subjects) so we can include shared subjects
  const deptSubjects = await departmentSubjectsService.findSubjectsForDepartment(student.departmentId as string, { include: { academicYear: true } });
  const possibleSubjectIds = Array.from(new Set([
    ...deptSubjects.map((s: any) => String(s._junctionId)).filter(Boolean),
    ...deptSubjects.map((s: any) => String(s.id)).filter(Boolean),
  ]));

  // DEBUG: show what we'll fetch
  console.log(`  Student dept subjects: ${deptSubjects.length}, possibleSubjectIds: ${possibleSubjectIds.length}`);

  // Fetch assignments owned by student's department (existing behavior)
  const deptAssignments = await assignmentService.findMany({ include: { subject: true }, where: { departmentId: student.departmentId } });

  // Fetch assignments that reference any of the possible subject ids (these may be owned by other departments — shared subjects)
  const sharedAssignments: any[] = [];
  for (const sid of possibleSubjectIds) {
    try {
      const as = await assignmentService.findMany({ include: { subject: true }, where: { subjectId: sid } });
      if (as && as.length) sharedAssignments.push(...as);
    } catch (e) {
      // ignore fetch errors for individual ids
      console.debug('failed to fetch assignments for subjectId', sid, e);
    }
  }

  // Merge and dedupe fetched assignments by _id (assignment.id)
  const mergedMap = new Map<string, any>();
  for (const a of [...deptAssignments, ...sharedAssignments]) mergedMap.set(a.id, a);
  const allAssignments = Array.from(mergedMap.values());
  // Match assignments by subject.academicYearId when available, otherwise fall back to the assignment.academicYearId field
  // Match assignments by subject.academicYearId when available, otherwise fall back to the assignment.academicYearId field
  let assignments = allAssignments.filter(a => {
    const subjectYear = a.subject?.academicYearId;
    const assignmentYear = (a as any).academicYearId;
    return (subjectYear && subjectYear === academicYearId) || (assignmentYear && assignmentYear === academicYearId);
  });

  // DEBUG: log assignment counts and samples
  try {
    console.log(`  Found ${assignments.length} faculty assignments after filtering by academicYearId`);
    console.log(`  Sample assignment IDs: ${assignments.slice(0,5).map(a => a.id).join(', ')}`);
    console.log(`  Sample subject IDs: ${assignments.slice(0,5).map(a => a.subjectId).join(', ')}`);
  } catch (e) {
    console.log('  Failed to log assignment samples', e);
  }

    // Deduplicate assignments by staffId + subjectId + normalized semester to avoid duplicate cards
    const dedupe = new Map<string, any>();
    for (const a of assignments) {
      const staffId = a.staffId || '';
      const subjectId = a.subjectId || '';
      const sem = normalizeSemester(a.semester || '');
      const key = `${staffId}::${subjectId}::${sem}`;
      if (!dedupe.has(key)) dedupe.set(key, { ...a, semester: sem });
    }
    assignments = Array.from(dedupe.values());
    
    // Get staff details for each assignment
    const allFeedback = await feedbackService.findMany({});
    
    const tasks = await Promise.all(
      assignments.map(async (a: any) => {
        // Get staff for this assignment using staffService
        let facultyName = "Faculty";
        try {
          const staff = await staffService.findUnique({ where: { id: a.staffId }, include: { user: true } });
          facultyName = staff?.user?.name ?? facultyName;
        } catch (err) {
          // fallback to default if staff fetch fails
          console.error('Failed to fetch staff for assignment', a.id, err);
        }

        const existing = allFeedback.find(f => f.assignmentId === a.id && f.studentId === userId);
        return {
          assignmentId: a.id,
          facultyName,
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
