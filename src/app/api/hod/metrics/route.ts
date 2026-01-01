import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { staffService, subjectService, userService, assignmentService, feedbackService, departmentSubjectsService } from "@/lib/mongodb-services";

export async function GET() {
  // authOptions is an untyped object in our codebase; cast to any to satisfy TypeScript's getServerSession signature
  const session = (await getServerSession(authOptions as any)) as any;
  if (!session?.user || (session.user as any).role !== "HOD") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = (session.user as any).id;
    const staffProfile = await staffService.findFirst({
      where: { userId },
    });

    if (!staffProfile) {
      return NextResponse.json({ error: "Staff profile not found" }, { status: 404 });
    }

    const departmentId = staffProfile.departmentId;
    const semester = "Odd 2025-26";

    // Get all staff in department to filter assignments and feedback
    const deptStaff = await staffService.findMany({ where: { departmentId } });
    const staffIds = deptStaff.map(s => s.id);

  // Get all assignments for this department in this semester
  const allAssignments = await assignmentService.findMany({ where: { semester, departmentId } });
  const deptAssignments = allAssignments; // already department-scoped
    const assignmentIds = deptAssignments.map(a => a.id);

    // Get all feedback for these assignments
    const allFeedback = await feedbackService.findMany({});
    const deptFeedback = allFeedback.filter(f => assignmentIds.includes(f.assignmentId));

    // OPTIMIZED: Run all counts in parallel
    const [totalStaff, totalSubjects, totalStudents] = await Promise.all([
      staffService.count({ departmentId }),
  // Count only subjects that belong to this department (via departmentSubjects)
  departmentSubjectsService.countSubjectsForDepartment(departmentId),
      userService.count({ departmentId, role: "STUDENT" }),
    ]);

    const totalAssignments = deptAssignments.length;
    const totalFeedbackSubmissions = deptFeedback.length;

    return NextResponse.json({
      staffCount: totalStaff,
      subjectCount: totalSubjects,
      studentCount: totalStudents,
      totalStaff,
      totalSubjects,
      totalStudents,
      totalAssignments,
      totalFeedbackSubmissions,
    });
  } catch (error) {
    // console.error("Error fetching HOD metrics:", error);
    return NextResponse.json({ error: "Failed to fetch metrics" }, { status: 500 });
  }
}
