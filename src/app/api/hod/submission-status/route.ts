/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { staffService, assignmentService, academicYearService, userService, feedbackService, subjectService } from "@/lib/mongodb-services";
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(request: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user?.role !== "HOD") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const staff = await staffService.findFirst({ where: { userId: session.user.id } });
    if (!staff || !staff.departmentId) return NextResponse.json({ error: "HOD or department not found" }, { status: 404 });
    const departmentId = staff.departmentId;

    // Get all subjects for this department (not staff) - match departmentId stored as string or ObjectId
    const db = await getDatabase();
    let deptObjId: any = null;
    try { if (departmentId && /^[0-9a-fA-F]{24}$/.test(String(departmentId))) deptObjId = new ObjectId(String(departmentId)); } catch (e) { deptObjId = null; }
    const subjectQuery: any = deptObjId ? { $or: [{ departmentId }, { departmentId: deptObjId }] } : { departmentId };
    const deptSubjectDocs = await db.collection('subjects').find(subjectQuery).toArray();
    const subjectIds = deptSubjectDocs.map((s: any) => s._id.toString());
    
    // Get all assignments for these subjects (regardless of which staff member is assigned)
    const allAssignments = await assignmentService.findMany({});

  // Fast filter by subjectIds (compare as strings to avoid ObjectId vs string mismatch)
  let deptAssignments = allAssignments.filter((a: any) => a.subjectId && subjectIds.includes(String(a.subjectId)));

    // Fallback: if none found, fetch all staff in department once and filter assignments by staffId
    if ((!deptAssignments || deptAssignments.length === 0) && allAssignments.length > 0) {
      const deptStaff = await staffService.findMany({ where: { departmentId } });
      const deptStaffIds = new Set(deptStaff.map((s: any) => s.id));
      deptAssignments = allAssignments.filter((a: any) => a.staffId && deptStaffIds.has(a.staffId));
    }

    // Attach subject data to each assignment in a batched way
    const uniqueSubjectIds = Array.from(new Set(deptAssignments.map((a: any) => String(a.subjectId)).filter(Boolean)));
    const subjectsMap = new Map<string, any>();
    if (uniqueSubjectIds.length > 0) {
      const subjects = await Promise.all(uniqueSubjectIds.map((id: any) => subjectService.findUnique({ id })));
      subjects.forEach((s: any) => { if (s) subjectsMap.set(String(s.id), s); });
    }
    const assignmentsWithSubjects = deptAssignments.map((a: any) => ({ ...a, subject: subjectsMap.get(String(a.subjectId)) }));

    // Deduplicate assignments that point to the same staff+subject+semester
    // (some documents differ only by semester string formatting and were inserted twice).
    const dedupeMap = new Map<string, any>();
    for (const a of assignmentsWithSubjects) {
      const staffId = a.staffId || '';
      const subjectId = a.subjectId || '';
      const sem = a.semester || '';
      const key = `${staffId}::${subjectId}::${sem}`;
      if (!dedupeMap.has(key)) dedupeMap.set(key, a);
    }
    const uniqueAssignmentsWithSubjects = Array.from(dedupeMap.values());

    if (!uniqueAssignmentsWithSubjects || uniqueAssignmentsWithSubjects.length === 0) {
      return NextResponse.json({ 
        semester: null, 
        academicYears: [], 
        selectedYearId: null, 
        students: [] 
      });
    }

    // Previously we picked a single semester which could give misleading totals.
    // Use all assignments for the department (across semesters) and let the UI optionally filter by academic year.
  const semesterToUse = null;
  // use deduped assignments for all counting and diagnostics
  const semesterAssignments = uniqueAssignmentsWithSubjects;
    // Determine available academic years present in these assignments (batched)
    // Normalize academicYearId to string to avoid ObjectId vs string mismatches
    // Determine academic years that belong to this department (via subject.academicYearId) and fetch them
    const yearIds = Array.from(new Set(semesterAssignments.map((a: any) => a.subject?.academicYearId && String(a.subject?.academicYearId)).filter(Boolean)));
    const academicYearsRaw = yearIds.length > 0 ? await Promise.all(yearIds.map((id: any) => academicYearService.findUnique({ id }))) : [];
    // Filter to only academic years that are associated with this department (avoid showing other-department years)
    const academicYears = academicYearsRaw.filter((y: any) => y && (!y.departmentId || String(y.departmentId) === String(departmentId))).filter(y => y !== null);

  // Read optional yearId query param to filter subject assignments to a specific academic year
    const url = new URL(request.url);
    let yearId = url.searchParams.get('yearId');

    // If no yearId provided, default to the first academic year (if available from department-specific years)
    if (!yearId && academicYears.length > 0 && academicYears[0] && academicYears[0].id) {
      yearId = academicYears[0].id;
    }

  const filteredSemesterAssignments = yearId ? semesterAssignments.filter((a) => String(a.subject?.academicYearId) === String(yearId)) : semesterAssignments;
  // assignmentIds are from deduped assignments
  const assignmentIds = filteredSemesterAssignments.map((a) => a.id);

    // Find students in department, filtered by academic year if specified (single query)
    const studentFilter: any = { role: 'STUDENT', departmentId };
    if (yearId) studentFilter.academicYearId = yearId;
    const students = await userService.findMany({ where: studentFilter, select: { id: true, name: true, email: true, academicYearId: true } });

    // Get all feedback relevant to these assignmentIds and these students in a single query
    const feedbackFilter: any = {};
    if (assignmentIds.length > 0) feedbackFilter.assignmentId = { $in: assignmentIds };
    const allFeedback = await feedbackService.findMany({ where: feedbackFilter });

    // Build a map studentId -> completedCount
    const completedMap = new Map<string, number>();
    for (const f of allFeedback) {
      const key = f.studentId;
      if (!key) continue;
      if (!completedMap.has(key)) completedMap.set(key, 0);
      if (assignmentIds.includes(f.assignmentId)) completedMap.set(key, completedMap.get(key)! + 1);
    }

    // Prefetch academic years for display
    const yearCache = new Map<string, any>();
    const results = [] as any[];
    for (const s of students) {
      const completed = completedMap.get(s.id) || 0;

      // Get the academic year info for display (cache)
      let yearInfo = '';
      if (s.academicYearId) {
        if (!yearCache.has(s.academicYearId)) {
          const y = await academicYearService.findUnique({ id: s.academicYearId });
          yearCache.set(s.academicYearId, y);
        }
        const year = yearCache.get(s.academicYearId);
        yearInfo = year ? (year.abbreviation || year.name) : '';
      }

      results.push({
        name: s.name || s.email || 'Unknown',
        email: s.email || '',
        year: yearInfo,
        totalTasks: assignmentIds.length,
        completedTasks: completed,
      });
    }

    // Diagnostic metadata to help debug mismatched totals
    const assignmentCountsByYear: Record<string, number> = {};
    for (const a of semesterAssignments) {
      const y = a.subject?.academicYearId ? String(a.subject?.academicYearId) : 'unknown';
      assignmentCountsByYear[y] = (assignmentCountsByYear[y] || 0) + 1;
    }

  return NextResponse.json({ semester: semesterToUse, academicYears, selectedYearId: yearId || null, students: results, diagnostics: { totalAssignments: semesterAssignments.length, assignmentCountsByYear } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch submission status' }, { status: 500 });
  }
}
