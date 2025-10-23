import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { staffService, userService, assignmentService, subjectService, feedbackService } from "@/lib/mongodb-services";

export async function GET(req: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user?.role !== "HOD") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const staff = await staffService.findFirst({ where: { userId: session.user.id } });
    if (!staff) return NextResponse.json({ error: "HOD profile not found" }, { status: 404 });

    const departmentId = staff.departmentId;

    // Get staff list anchored to department, but also include any staff who are assigned to subjects of this department
    // 1) find subjects for this department
    const deptSubjects = await subjectService.findMany({ where: { departmentId } });
  const deptSubjectIds = new Set((deptSubjects || []).map((s: any) => s.id));

    // 2) find assignments that point to these subjects and collect staffIds
    const allAssignments = await assignmentService.findMany({});
    const assignedStaffIds = new Set<string>();
    // Normalize assignment.semester before use and detect subject matches
    for (const a of (allAssignments || [])) {
      // normalize semester strings so "Odd 2025-26" and "Odd Semester 2025-26" are treated the same
      const normalizeSemester = (await import('@/lib/mongodb-services')).normalizeSemester;
      a.semester = normalizeSemester(a.semester);
      const subjId = a.subjectId ? String(a.subjectId) : null;
      const staffId = a.staffId ? String(a.staffId) : null;
      if (subjId && deptSubjectIds.has(subjId)) {
        if (staffId) assignedStaffIds.add(staffId);
      }
    }

    // 3) Build staff list robustly:
    // - include all staff who have assignments for subjects of this department (even if their department differs)
    // - include all staff who belong to this department (even if they don't currently have assignments)

    // Fetch assignments that point to dept subjects (we already scanned allAssignments above)
    const assignmentsForDeptSubj = (allAssignments || []).filter((a: any) => {
      const subjId = a.subjectId ? String(a.subjectId) : null;
      return subjId && deptSubjectIds.has(subjId);
    });

    const staffIdsFromAssignments = new Set<string>();
    for (const a of assignmentsForDeptSubj) {
      if (a.staffId) staffIdsFromAssignments.add(String(a.staffId));
    }

    // Fetch staff records for these staff ids
    const staffFromAssignments = (Array.from(staffIdsFromAssignments).length > 0)
      ? await Promise.all(Array.from(staffIdsFromAssignments).map((id) => staffService.findUnique({ where: { id }, include: { user: true, department: true } })))
      : [];

    // Fetch department staff
    const deptStaff = await staffService.findMany({ where: { departmentId }, include: { user: true, department: true } });

    // Merge and dedupe by staff id (prefer dept staff record when available)
    const staffMap = new Map<string, any>();
    for (const s of staffFromAssignments) if (s) staffMap.set(s.id, s);
    for (const s of deptStaff) if (s) staffMap.set(s.id, s);
  const staffList = Array.from(staffMap.values());

  // debug flag: ?debug=1 will include internal counts to help diagnose missing staff
  const url = new URL(req.url);
  const debug = url.searchParams.get('debug');

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

    const normalizeSemester = (await import('@/lib/mongodb-services')).normalizeSemester;

    const reports = await Promise.all(staffList.map(async (s: any) => {
      // Fetch user and assignments for this staff member
      const user = await userService.findUnique({ id: s.userId });
      let assignments = await assignmentService.findMany({ where: { staffId: s.id }, include: { subject: true } });

      // Only keep assignments that belong to subjects in this HOD's department
      assignments = (assignments || []).filter((a: any) => {
        const subjId = a.subjectId ? String(a.subjectId) : null;
        return subjId && deptSubjectIds.has(subjId);
      });

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

        const totalStudentsForSubject = await getStudentCountForYear(subject?.academicYearId);

        return {
          assignmentId: a.id,
          semester: a.semester,
          subject: subject,
          averages: avg,
          submissionCount: feedbacks.length || 0,
          totalResponses: feedbacks.length || 0,
          totalStudents: totalStudentsForSubject,
          isReleased: hasFeedback ? feedbacks.every((ff: any) => ff.isReleased) : false,
        };
      }));
      
      const validReports = staffReports.filter(Boolean); // Remove null entries

      return {
        staffId: s.id,
        staffName: user?.name ?? user?.email ?? "Unknown",
        reports: validReports,
      };
    }));

    const resp: any = { reports };
    if (debug) {
      // attempt to fetch subjects directly for debugging (bypass subjectService.findMany behavior)
      const directSubjects = await (await import('@/lib/mongodb-services')).subjectService.findMany({ where: { departmentId } });
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
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
  }
}
