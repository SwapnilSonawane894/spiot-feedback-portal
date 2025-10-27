/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { staffService, assignmentService, academicYearService, userService, feedbackService, subjectService, departmentSubjectsService } from "@/lib/mongodb-services";
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

    // Get all departmentSubjects junction rows for this HOD's department. This ensures
    // we only consider subjects linked to this department (junction rows include _junctionId)
    const deptSubjects = await departmentSubjectsService.findSubjectsForDepartment(departmentId, { include: { academicYear: true } });

    // Build list of possible subject identifiers that assignments might reference.
    // Some assignments reference the master subject id, others reference the junction _id.
    const subjectMasterIds: string[] = [];
    const junctionIds: string[] = [];
    for (const ds of deptSubjects) {
      if (ds.id) subjectMasterIds.push(String(ds.id));
      if ((ds as any)._junctionId) junctionIds.push(String((ds as any)._junctionId));
    }

    const possibleSubjectIds = Array.from(new Set([...subjectMasterIds, ...junctionIds]));

  // Get all assignments that reference any of these subject identifiers
  // Use explicit $in to ensure assignmentService forwards the query correctly
  let deptAssignments = possibleSubjectIds.length > 0 ? await assignmentService.findMany({ where: { subjectId: { $in: possibleSubjectIds } } }) : [];

    // Fallback kept intentionally minimal: if no assignments found for subjects, attempt to find by staff in department
    if ((!deptAssignments || deptAssignments.length === 0)) {
      const deptStaff = await staffService.findMany({ where: { departmentId } });
      const deptStaffIds = new Set(deptStaff.map((s: any) => s.id));
      // fetch any assignments that belong to department staff and department (safer fallback)
      const fallbackAssignments = await assignmentService.findMany({ where: { departmentId } });
      deptAssignments = fallbackAssignments.filter((a: any) => a.staffId && deptStaffIds.has(a.staffId));
    }

    // Attach subject data to each assignment in a batched way. For assignments that
    // reference a junction id, try to resolve to the master subject as well.
    const uniqueSubjectIds = Array.from(new Set(deptAssignments.map((a: any) => String(a.subjectId)).filter(Boolean)));
    const subjectsMap = new Map<string, any>();
    if (uniqueSubjectIds.length > 0) {
      const subjects = await Promise.all(uniqueSubjectIds.map((id: any) => subjectService.findUnique({ id })));
      subjects.forEach((s: any) => { if (s) subjectsMap.set(String(s.id), s); });
    }

    // Also build a map from master subject id -> junction row so we can attach academicYear info
    const masterToJunction: Map<string, any[]> = new Map();
    for (const ds of deptSubjects) {
      const masterId = String(ds.id);
      const jun = (ds as any)._junctionId || null;
      if (!masterToJunction.has(masterId)) masterToJunction.set(masterId, []);
      masterToJunction.get(masterId)!.push(ds);
    }

    const assignmentsWithSubjects = deptAssignments.map((a: any) => {
      const result: any = { ...a };
      // If assignment.subjectId matches a master subject id, attach subject from subjectsMap
      if (subjectsMap.has(String(a.subjectId))) {
        result.subject = subjectsMap.get(String(a.subjectId));
      } else {
        // If not, it may be a junction id; try to resolve by finding a deptSubjects row with _junctionId === a.subjectId
        const found = deptSubjects.find((ds: any) => String(ds._junctionId) === String(a.subjectId));
        if (found) {
          // attach master subject info if available
          if (found.id) result.subject = subjectsMap.get(String(found.id)) || { id: found.id, name: found.name, subjectCode: found.subjectCode };
          // keep junction metadata on the assignment for later
          result._junction = found;
        }
      }
      // set a canonicalSubjectId (master subject id) when possible so dedupe works across master vs junction references
      if (result.subject && result.subject.id) result.canonicalSubjectId = String(result.subject.id);
      else if (result._junction && result._junction.id) result.canonicalSubjectId = String(result._junction.id);
      else if (result.subjectId) result.canonicalSubjectId = String(result.subjectId);
      return result;
    });

    // Deduplicate assignments that point to the same staff+subject+semester
    // (some documents differ only by semester string formatting and were inserted twice).
    const dedupeMap = new Map<string, any>();
    for (const a of assignmentsWithSubjects) {
      const staffId = a.staffId || '';
      const subjectId = a.canonicalSubjectId || a.subjectId || '';
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
    // For assignments that referenced a junction we may have junction.academicYear, otherwise the subject may have academicYearId
    const yearIdSet = new Set<string>();
    for (const a of semesterAssignments) {
      const yearFromSubject = a.subject?.academicYearId ? String(a.subject?.academicYearId) : null;
      const yearFromJunction = a._junction?.academicYear ? (a._junction.academicYear.id || a._junction.academicYear._id || null) : null;
      if (yearFromSubject) yearIdSet.add(String(yearFromSubject));
      else if (yearFromJunction) yearIdSet.add(String(yearFromJunction));
    }
    const yearIds = Array.from(yearIdSet).filter(Boolean);
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

  // Helper to resolve canonical academicYearId for an assignment
  const getAssignmentYearId = (a: any) => {
    if (a.academicYearId) return String(a.academicYearId);
    if (a.subject && a.subject.academicYearId) return String(a.subject.academicYearId);
    if (a._junction && a._junction.academicYear) return String(a._junction.academicYear.id || a._junction.academicYear._id);
    return 'unknown';
  };

  // Group full assignment objects by academic year (useful for per-student counts)
  const assignmentsByYear: Map<string, any[]> = new Map();
  for (const a of semesterAssignments) {
    const yearKey = getAssignmentYearId(a);
    if (!assignmentsByYear.has(yearKey)) assignmentsByYear.set(yearKey, []);
    assignmentsByYear.get(yearKey)!.push(a);
  }

  // Debug: print grouped assignment counts and sample subjectCodes
  try {
    console.log('📊 Assignments grouped by academic year:');
    for (const [yearIdKey, assignments] of assignmentsByYear.entries()) {
      const yearObj = academicYears.find((y: any) => String(y._id || y.id) === String(yearIdKey));
      const abbreviation = yearObj ? (yearObj.abbreviation || yearObj.name) : yearIdKey;
      console.log(`  ${abbreviation}: ${assignments.length} assignments`);
      const samples = assignments.slice(0, 3).map((aa: any) => aa.subject?.subjectCode || aa._junction?.subjectCode || aa.subjectId || aa.id);
      console.log(`    Sample subjects: ${samples.join(', ')}`);
    }
  } catch (e) {
    // ignore logging errors
  }

  // If UI provided a yearId filter, reduce to that; otherwise we'll compute per-student from the grouped map
  const filteredSemesterAssignments = yearId ? semesterAssignments.filter((a) => String(getAssignmentYearId(a)) === String(yearId)) : semesterAssignments;

  // For feedback lookup: if yearId is provided we only need feedback for those assignments, otherwise fetch for all dept assignments
  const feedbackAssignmentIds = (yearId ? filteredSemesterAssignments : semesterAssignments).map((a) => a.id);

  // Find students in department, filtered by academic year if UI asked for one
  const studentFilter: any = { role: 'STUDENT', departmentId };
  if (yearId) studentFilter.academicYearId = yearId;
  const students = await userService.findMany({ where: studentFilter, select: { id: true, name: true, email: true, academicYearId: true } });

  // Fetch feedback for the relevant assignments in one go
  const allFeedback = feedbackAssignmentIds.length > 0 ? await feedbackService.findMany({ where: { assignmentId: { $in: feedbackAssignmentIds } } }) : [];

  // Build a map studentId -> Set(assignmentId) for quick intersection checks
  const feedbackByStudent = new Map<string, Set<string>>();
  for (const f of allFeedback) {
    if (!f.studentId) continue;
    if (!feedbackByStudent.has(f.studentId)) feedbackByStudent.set(f.studentId, new Set());
    feedbackByStudent.get(f.studentId)!.add(String(f.assignmentId));
  }

  // Prefetch academic years for display (cache)
  const yearCache = new Map<string, any>();
  const results = [] as any[];
  for (const s of students) {
    // assignments assigned for this student's academic year (empty array if unknown)
    const studentYearAssignments = s.academicYearId ? (assignmentsByYear.get(String(s.academicYearId)) || []) : [];
    const studentAssignmentIds = studentYearAssignments.map((a: any) => String(a.id));

    // Count completed tasks for this student only within their year's assignments
    const completedSet = feedbackByStudent.get(String(s.id)) || new Set<string>();
    const completedTasks = studentAssignmentIds.filter(id => completedSet.has(id)).length;

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

    const totalTasks = studentAssignmentIds.length;

    results.push({
      name: s.name || s.email || 'Unknown',
      email: s.email || '',
      year: yearInfo,
      totalTasks,
      completedTasks,
      _debug: {
        studentId: s.id,
        academicYearId: s.academicYearId,
        yearAbbreviation: yearInfo,
        assignmentsForThisYear: studentAssignmentIds.length,
        completedCount: completedTasks
      }
    });
  }

    // Diagnostic metadata to help debug mismatched totals
    const assignmentCountsByYear: Record<string, { count: number; samples: string[] }> = {};
    for (const a of semesterAssignments) {
      const y = getAssignmentYearId(a) || 'unknown';
      if (!assignmentCountsByYear[y]) assignmentCountsByYear[y] = { count: 0, samples: [] };
      assignmentCountsByYear[y].count += 1;
      const code = a.subject?.subjectCode || a._junction?.subjectCode || a.subjectId || a.id;
      if (assignmentCountsByYear[y].samples.length < 5) assignmentCountsByYear[y].samples.push(String(code));
    }

    // Diagnostic logging to help HODs/devs validate counts
    try {
      console.log('🔍 Submission Status Query:');
      console.log('  Department ID:', departmentId);
      console.log('  Dept subjects (junction rows):', deptSubjects.length);
      console.log('  Possible subject IDs (master + junction):', possibleSubjectIds.length);
      console.log('  Assignments fetched for dept:', deptAssignments.length);
      console.log('  Deduped assignments used for counts:', semesterAssignments.length);
      console.log('  Academic years available:', academicYears.map((y: any) => y.id || y._id));
      console.log('  Students considered:', students.length);
    } catch (e) {
      // swallow logging errors
    }

    return NextResponse.json({ semester: semesterToUse, academicYears, selectedYearId: yearId || null, students: results, diagnostics: { totalAssignments: semesterAssignments.length, assignmentCountsByYear } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch submission status' }, { status: 500 });
  }
}
