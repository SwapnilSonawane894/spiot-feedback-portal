/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { staffService, assignmentService, academicYearService, userService, feedbackService, subjectService } from "@/lib/firebase-services";

export async function GET(request: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user?.role !== "HOD") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const staff = await staffService.findFirst({ where: { userId: session.user.id } });
    if (!staff || !staff.departmentId) return NextResponse.json({ error: "HOD or department not found" }, { status: 404 });
    const departmentId = staff.departmentId;

    // Get all subjects for this department (not staff) - this allows cross-departmental staff assignments
    const deptSubjects = await subjectService.findMany({ where: { departmentId } });
    const subjectIds = deptSubjects.map((s: any) => s.id);
    
    // Get all assignments for these subjects (regardless of which staff member is assigned)
    const allAssignments = await assignmentService.findMany({});
    const deptAssignments = allAssignments.filter((a: any) => subjectIds.includes(a.subjectId));
    
    // Attach subject data to each assignment
    const assignmentsWithSubjects = await Promise.all(
      deptAssignments.map(async (a: any) => {
        const subject = await subjectService.findUnique({ id: a.subjectId });
        return { ...a, subject };
      })
    );
    
    if (!assignmentsWithSubjects || assignmentsWithSubjects.length === 0) {
      return NextResponse.json({ 
        semester: null, 
        academicYears: [], 
        selectedYearId: null, 
        students: [] 
      });
    }

    // Determine the semester to consider: pick the most common or latest string (best-effort)
    const semesters = Array.from(new Set(assignmentsWithSubjects.map((a) => a.semester)));
    const semesterToUse = semesters.sort().reverse()[0];

    const semesterAssignments = assignmentsWithSubjects.filter((a) => a.semester === semesterToUse);
    // Determine available academic years present in these assignments
    const yearIds = Array.from(new Set(semesterAssignments.map((a: any) => a.subject?.academicYearId).filter(Boolean)));
    const academicYearsRaw = yearIds.length > 0 ? await Promise.all(yearIds.map((id: any) => academicYearService.findUnique({ id }))) : [];
    const academicYears = academicYearsRaw.filter(y => y !== null);

    // Read optional yearId query param to filter subject assignments to a specific academic year
    const url = new URL(request.url);
    const yearId = url.searchParams.get('yearId');

    const filteredSemesterAssignments = yearId ? semesterAssignments.filter((a) => a.subject?.academicYearId === yearId) : semesterAssignments;
    const assignmentIds = filteredSemesterAssignments.map((a) => a.id);

    // Find students in department, filtered by academic year if specified
    const studentFilter: any = { role: 'STUDENT', departmentId };
    if (yearId) {
      studentFilter.academicYearId = yearId;
    }
    const students = await userService.findMany({ where: studentFilter, select: { id: true, name: true, email: true, academicYearId: true } });

    // Get all feedback for these students
    const allFeedback = await feedbackService.findMany({});
    
    const results = [] as any[];
    for (const s of students) {
      const completed = allFeedback.filter((f: any) => f.studentId === s.id && assignmentIds.includes(f.assignmentId)).length;
      
      // Get the academic year info for display
      let yearInfo = '';
      if (s.academicYearId) {
        const year = await academicYearService.findUnique({ id: s.academicYearId });
        yearInfo = year ? (year.abbreviation || year.name) : '';
      }
      
      results.push({ 
        name: s.name || s.email || 'Unknown', 
        email: s.email || '', 
        year: yearInfo,
        totalTasks: assignmentIds.length, 
        completedTasks: completed 
      });
    }

    return NextResponse.json({ semester: semesterToUse, academicYears, selectedYearId: yearId || null, students: results });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch submission status' }, { status: 500 });
  }
}
