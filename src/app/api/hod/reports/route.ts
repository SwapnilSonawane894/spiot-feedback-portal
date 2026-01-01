import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { staffService, userService, assignmentService, subjectService, feedbackService, departmentSubjectsService } from "@/lib/mongodb-services";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(req: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user?.role !== "HOD") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const staff = await staffService.findFirst({ where: { userId: session.user.id } });
    if (!staff) return NextResponse.json({ error: "HOD profile not found" }, { status: 404 });

    const departmentId = staff.departmentId;
    const db = await getDatabase();

  // debug flag and optional includeExternal query param
  const url = new URL(req.url);
  const debug = url.searchParams.get('debug');
  const includeExternal = url.searchParams.get('includeExternal') === '1';
  const semester = url.searchParams.get('semester');

    // Get staff list anchored to department, but also include any staff who are assigned to subjects of this department
    // 1) find subjects that have this department in their departments array or departmentIds
    let departmentIdObj;
    try {
      departmentIdObj = new ObjectId(departmentId);
    } catch (e) {
      // console.log('Department ID is not a valid ObjectId');
    }

    const query = {
      $or: [
        { departmentIds: { $in: [String(departmentId), departmentIdObj].filter(Boolean) } },
        { "departments.id": { $in: [String(departmentId), departmentIdObj].filter(Boolean) } }
      ]
    };

    const deptSubjects = await db.collection("subjects").find(query).toArray();

    const deptSubjectIds = new Set<string>();
    // Include all ID variants: subject._id and subject.id
    for (const s of (deptSubjects || [])) {
      if (s && s._id) deptSubjectIds.add(String(s._id));
      if (s && s.id) deptSubjectIds.add(String(s.id));
    }
    // console.log('🔍 deptSubjectIds built:', { count: deptSubjectIds.size, sample: Array.from(deptSubjectIds).slice(0,5) });

    // 2) find all assignments for this department (do NOT filter by semester at DB level because
    //    semester strings may be inconsistent; normalize and filter client-side)
    // console.log('🔍 GET /api/hod/reports DEBUG:');
    // console.log('  HOD Department ID:', departmentId);
    // console.log('  Requested Semester:', semester);

    const allAssignmentsRaw = await assignmentService.findMany({ where: { departmentId } });
    // console.log('  Found assignments (department total):', (allAssignmentsRaw || []).length);
    // if ((allAssignmentsRaw || []).length > 0) console.log('  Sample raw assignment:', allAssignmentsRaw[0]);

    // Normalize semesters and filter them client-side to match target semester string
    const normalizeSemester = (await import('@/lib/mongodb-services')).normalizeSemester;
    const targetSemester = normalizeSemester(semester || '');
    const allAssignments = (allAssignmentsRaw || []).filter((a: any) => normalizeSemester(a.semester || '') === targetSemester);
    // console.log('  Assignments after semester normalization/filter:', (allAssignments || []).length);

    const assignedStaffIds = new Set<string>();
    // Collect staffIds from assignments that reference this department's subjects
    for (const a of (allAssignments || [])) {
      const subjId = a.subjectId ? String(a.subjectId) : null;
      const staffId = a.staffId ? String(a.staffId) : null;
      const matches = subjId ? deptSubjectIds.has(subjId) : false;
      if (!matches && subjId) {
        // console.log(`  ⚠️  Assignment subjectId ${subjId} NOT in deptSubjectIds`);
      }
      if (subjId && matches) {
        if (staffId) assignedStaffIds.add(staffId);
      }
    }

    // 3) Build staff list robustly:
    // - include all staff who have assignments for subjects of this department (even if their department differs)
    // - include all staff who belong to this department (even if they don't currently have assignments)

    // Fetch assignments that point to dept subjects (filtered above)
    // Only include assignments that were created by THIS department (assignment.departmentId must match)
    // console.log('🔍 Filtering assignments by department ownership:');
    // console.log('  Total assignments matching dept subjects (before ownership filter):', (allAssignments || []).filter(a => { const subjId = a.subjectId ? String(a.subjectId) : null; return subjId && deptSubjectIds.has(subjId); }).length);
    const assignmentsForDeptSubj = (allAssignments || []).filter((a: any) => {
      const subjId = a.subjectId ? String(a.subjectId) : null;
      const assignmentDeptId = a.departmentId ? String(a.departmentId) : null;
      const matches = subjId && deptSubjectIds.has(subjId) && assignmentDeptId === String(departmentId);
      return !!matches;
    });
    // console.log('  After filtering by assignment.departmentId:', assignmentsForDeptSubj.length);

    const staffIdsFromAssignments = new Set<string>();
    for (const a of assignmentsForDeptSubj) {
      if (a.staffId) staffIdsFromAssignments.add(String(a.staffId));
    }

    // Build a quick map of staffId -> assignments that belong to dept subjects.
    // This ensures we use the same assignment set discovered earlier (avoids
    // missing assignments when fetching by staffId later due to id coercion issues).
    const staffAssignmentsMap = new Map<string, any[]>();
    for (const a of assignmentsForDeptSubj) {
      const sid = a.staffId ? String(a.staffId) : null;
      if (!sid) continue;
      if (!staffAssignmentsMap.has(sid)) staffAssignmentsMap.set(sid, []);
      // normalize semester for display (use previously imported normalizeSemester)
      a.semester = normalizeSemester(a.semester || '');
      staffAssignmentsMap.get(sid)!.push(a);
    }

    // Fetch staff records for these staff ids
    let staffFromAssignments = (Array.from(staffIdsFromAssignments).length > 0)
      ? await Promise.all(Array.from(staffIdsFromAssignments).map((id) => staffService.findUnique({ where: { id }, include: { user: true, department: true } })))
      : [];

    // Fetch department staff
    const deptStaff = await staffService.findMany({ where: { departmentId }, include: { user: true, department: true } });

    // Build a map for quick lookup of fetched staff records from assignments
    const staffRecordMap = new Map<string, any>();
    for (const s of (staffFromAssignments || [])) {
      if (s && s.id) staffRecordMap.set(String(s.id), s);
    }

    // Build subject -> assigned staffIds map to resolve conflicts where multiple
    // staff are assigned to the same subject. Preference rule:
    //  - If at least one assignment for the subject belongs to this HOD's department
    //    (assignment.departmentId matches HOD department), show only those departmental
    //    staff for that subject (filter out external staff).
    //  - Otherwise include all assigned staff for the subject.
    const subjectAssignmentsMap = new Map<string, string[]>();
    const subjectAssignmentsFullMap = new Map<string, any[]>();
    for (const a of assignmentsForDeptSubj) {
      const subj = a.subjectId ? String(a.subjectId) : null;
      const sid = a.staffId ? String(a.staffId) : null;
      if (!subj || !sid) continue;
      if (!subjectAssignmentsMap.has(subj)) subjectAssignmentsMap.set(subj, []);
      if (!subjectAssignmentsFullMap.has(subj)) subjectAssignmentsFullMap.set(subj, []);
      subjectAssignmentsMap.get(subj)!.push(sid);
      subjectAssignmentsFullMap.get(subj)!.push(a);
    }

    // Include ALL staff assigned to department subjects (both internal and external)
    const includeStaffIds = new Set<string>();
    for (const [subj, sids] of subjectAssignmentsMap.entries()) {
      sids.forEach(id => includeStaffIds.add(id));
    }

    // Also include department staff (so HOD sees their faculty even if unassigned)
    for (const s of (deptStaff || [])) if (s && s.id) includeStaffIds.add(String(s.id));

    // Build final staff list by resolving records (prefer fetched records)
    const staffList: any[] = [];

    // console.log('🔍 Building final staff list:');
    // console.log('  includeStaffIds count:', includeStaffIds.size);
    // console.log('  Sample IDs:', Array.from(includeStaffIds).slice(0, 5));

    for (const id of Array.from(includeStaffIds)) {
      const rec = staffRecordMap.get(id) || (await staffService.findUnique({ where: { id }, include: { user: true, department: true } }));
      // console.log(`  Staff ID ${id}:`, rec ? 'FOUND' : '❌ NOT FOUND');
      if (rec) staffList.push(rec);
    }

      // Debug: show faculty counts before building reports
      // console.log('  Faculty candidate ids count (includeStaffIds):', includeStaffIds.size);
      // console.log('  Resolved staffList length:', staffList.length);
      if (staffList.length > 0) {
        const first = staffList[0];
        // console.log('  First faculty sample:', { id: first.id, user: first.user?.name || first.user?.email });
      }

    // debug flag: ?debug=1 will include internal counts to help diagnose missing staff

    // We'll cache student counts per academicYearId so subject cards show correct totals (avoid counting entire department for every subject)
    const studentCountByYear: Record<string, number> = {};
    async function getStudentCountForYear(yearId?: string | null) {
      const key = yearId ? String(yearId) : 'all';
      if (studentCountByYear[key] !== undefined) return studentCountByYear[key];
      const filter: any = { role: 'STUDENT', departmentId };
      if (yearId) filter.academicYearId = yearId;
      const cnt = await userService.count(filter);
      studentCountByYear[key] = cnt;
      return cnt;
    }

    const reports = await Promise.all(staffList.map(async (s: any) => {
      // Fetch user. For assignments, use the precomputed staffAssignmentsMap so
      // we don't miss any assignments due to id/string/ObjectId mismatches.
      const user = await userService.findUnique({ id: s.userId });
      let assignments = staffAssignmentsMap.get(String(s.id)) || [];

      // dedupe assignments by subjectId + normalized semester to avoid duplicates caused by inconsistent semester strings
      const seen = new Set<string>();
      assignments = assignments.filter((a: any) => {
        const sem = normalizeSemester(a.semester || '');
        const key = `${a.subjectId || ''}::${sem}`;
        if (seen.has(key)) return false;
        seen.add(key);
        // ensure assignment.semester is normalized for display
        a.semester = sem;
        return true;
      });
      
      const staffReports = await Promise.all(assignments.map(async (a: any) => {
        // Fetch subject and feedbacks for this assignment
        const subject = await subjectService.findUnique({ id: a.subjectId });
        const feedbacks = await feedbackService.findMany({ where: { assignmentId: a.id } });
        
        // If no feedbacks yet, still include the assignment with zeroed metrics
        const hasFeedback = feedbacks && feedbacks.length > 0;

        // Get feedbacks specific to this assignment
        const feedbackQuery = { assignmentId: a.id };
        // console.log('Feedback query:', JSON.stringify(feedbackQuery, null, 2));
        const validFeedbacks = await db.collection('feedback').find(feedbackQuery).toArray();
        // console.log(`Found ${validFeedbacks.length} feedbacks for assignment ${a.id}`);

        // Collect student suggestions from feedbacks
        const studentSuggestions: string[] = [];
        if (hasFeedback) {
          feedbacks.forEach((f: any) => {
            const text = f.any_suggestion;
            if (text && typeof text === 'string' && text.trim().length > 0) {
              studentSuggestions.push(text.trim());
            }
          });
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

        if (hasFeedback) {
          feedbacks.forEach((f: any) => {
            paramKeys.forEach((k) => {
              avg[k] += f[k] ?? 0;
            });
          });

          paramKeys.forEach((k) => {
            avg[k] = parseFloat((avg[k] / feedbacks.length).toFixed(2));
          });
        }

        // Get all students for this department and academic year
        const studentQuery = {
          role: 'STUDENT',
          departmentId: String(departmentId), // ensure string format
          academicYearId: String(subject?.academicYearId) // ensure string format
        };
        
        // console.log('🔍 Student query:', JSON.stringify(studentQuery, null, 2));
        
        // Also try with ObjectId for academicYearId
        let academicYearIdObj;
        try {
          academicYearIdObj = new ObjectId(subject?.academicYearId);
        } catch (e) {
          // console.log('Academic Year ID is not a valid ObjectId');
        }

        const studentQueryWithObjectId = {
          role: 'STUDENT',
          departmentId: String(departmentId),
          academicYearId: { $in: [String(subject?.academicYearId), academicYearIdObj].filter(Boolean) }
        };

        // console.log('🔍 Student query with ObjectId:', JSON.stringify(studentQueryWithObjectId, null, 2));
        
        const students = await db.collection('users').find(studentQueryWithObjectId).toArray();
        const totalStudentsForSubject = students.length;
        
        // console.log('🔍 Total students found:', totalStudentsForSubject);
        if (totalStudentsForSubject > 0) {
          // console.log('Sample student:', JSON.stringify(students[0], null, 2));
        }
        // console.log('Subject details:', JSON.stringify(subject, null, 2));

        return {
          assignmentId: a.id,
          semester: a.semester,
          subject: subject,
          averages: avg,
          submissionCount: validFeedbacks.length || 0,
          totalResponses: validFeedbacks.length || 0,
          totalStudents: totalStudentsForSubject || 0,
          isReleased: hasFeedback ? feedbacks.every((ff: any) => ff.isReleased) : false,
          studentSuggestions: studentSuggestions, // Include student suggestions for HOD
        };
      }));
      
      const validReports = staffReports.filter(Boolean); // Remove null entries

      // Aggregate all student suggestions from all reports for this staff member
      const allStudentSuggestions: string[] = [];
      validReports.forEach((r: any) => {
        if (r.studentSuggestions && r.studentSuggestions.length > 0) {
          allStudentSuggestions.push(...r.studentSuggestions);
        }
      });

      const staffName = user?.name ?? user?.email ?? "Unknown";
      
      // Skip staff with "Unknown" name and no assignments
      if (staffName === "Unknown" && validReports.length === 0) {
        return null;
      }
      
      return {
        staffId: s.id,
        staffName,
        reports: validReports,
        studentSuggestions: allStudentSuggestions, // All suggestions for this staff
      };
    }));

    // Filter out null entries (staff with Unknown name and no assignments)
    const filteredReports = reports.filter(Boolean);

    const resp: any = { reports: filteredReports };
    if (debug) {
      // attempt to fetch subjects directly for debugging (bypass subjectService.findMany behavior)
  const directSubjects = await departmentSubjectsService.findSubjectsForDepartment(departmentId);
      resp._debug = {
        departmentId: String(departmentId),
        deptSubjectsCount: deptSubjectIds.size,
        assignmentsForDeptSubjectsCount: assignmentsForDeptSubj.length,
        assignmentsForDeptSubjectsSample: assignmentsForDeptSubj.slice(0, 10).map((a: any) => ({ id: a.id, subjectId: String(a.subjectId), staffId: String(a.staffId), semester: a.semester })),
        requestedStaffFromAssignments: Array.from(staffIdsFromAssignments).length,
        foundStaffFromAssignments: staffFromAssignments.filter(Boolean).length,
        deptStaffCount: (deptStaff || []).length,
        mergedStaffCount: staffList.length,
        directSubjectsCount: directSubjects.length,
        directSubjectsSample: directSubjects.slice(0, 5),
      };
    }

    return NextResponse.json(resp);
  } catch (error) {
    // console.error(error);
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
  }
}
