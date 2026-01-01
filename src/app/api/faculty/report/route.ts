import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { staffService, assignmentService, hodSuggestionService, subjectService, feedbackService, departmentService } from "@/lib/mongodb-services";

export async function GET(req: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Accept both STAFF and FACULTY roles (some accounts use FACULTY string)
  if (session.user?.role !== "STAFF" && session.user?.role !== "HOD" && session.user?.role !== "FACULTY") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const staff = await staffService.findFirst({ where: { userId: session.user.id } });
    if (!staff) {
      // Provide additional debug info in development to help tracing missing staff profiles
      if (process.env.NODE_ENV !== 'production') {
        const staffRows = await staffService.findMany({ where: { userId: session.user.id } });
        return NextResponse.json({ error: "Staff profile not found", debug: { sessionUserId: session.user.id, staffRows } }, { status: 404 });
      }
      return NextResponse.json({ error: "Staff profile not found" }, { status: 404 });
    }

  console.log('📊 [Faculty Report] Starting report generation');
  console.log('📊 [Faculty Report] Staff ID:', staff.id);
  console.log('📊 [Faculty Report] Staff Department ID:', staff.departmentId);
  console.log('📊 [Faculty Report] User Role:', session.user?.role);

  // Check for optional query params
  const url = new URL(req.url);
  const filterDeptId = url.searchParams.get('departmentId');
  const filterSemester = url.searchParams.get('semester'); // New: semester filter
  const debugMode = url.searchParams.get('debug') === '1';

  // Fetch ALL assignments for this staff (across all departments)
  let allAssignments = await assignmentService.findMany({ where: { staffId: staff.id } });
  
  // Filter by semester if provided
  if (filterSemester) {
    const { normalizeSemester } = await import('@/lib/mongodb-services');
    const targetSemester = normalizeSemester(filterSemester);
    allAssignments = allAssignments.filter((a: any) => normalizeSemester(a.semester || '') === targetSemester);
    console.log('📊 [Faculty Report] Filtered by semester:', filterSemester, '- Assignments:', allAssignments.length);
  }
  
  console.log('📊 [Faculty Report] Total assignments found:', allAssignments.length);
  
  if (allAssignments.length > 0) {
    console.log('📊 [Faculty Report] Sample assignment:', {
      id: allAssignments[0].id,
      staffId: allAssignments[0].staffId,
      departmentId: allAssignments[0].departmentId,
      subjectId: allAssignments[0].subjectId,
      semester: allAssignments[0].semester,
    });
  }

  // Debug info
  if (debugMode) {
    const allFeedbacksDebug: any[] = [];
    for (const a of allAssignments) {
      const fbs = await feedbackService.findMany({ where: { assignmentId: a.id } });
      allFeedbacksDebug.push({
        assignmentId: a.id,
        departmentId: a.departmentId,
        subjectId: a.subjectId,
        semester: a.semester,
        feedbackCount: fbs.length,
        releasedCount: fbs.filter((f: any) => f.isReleased === true).length,
        sampleFeedback: fbs[0] ? { isReleased: fbs[0].isReleased, studentId: fbs[0].studentId } : null,
      });
    }
    return NextResponse.json({
      debug: true,
      staffId: staff.id,
      staffDepartmentId: staff.departmentId,
      userId: session.user.id,
      role: session.user?.role,
      assignmentsCount: allAssignments.length,
      assignments: allFeedbacksDebug,
    });
  }

  // Group assignments by departmentId
  const assignmentsByDept = new Map<string, any[]>();
  for (const a of allAssignments) {
    const deptId = a.departmentId || 'unknown';
    if (!assignmentsByDept.has(deptId)) assignmentsByDept.set(deptId, []);
    assignmentsByDept.get(deptId)!.push(a);
  }
  
  console.log('📊 [Faculty Report] Departments with assignments:', Array.from(assignmentsByDept.keys()));

  // If filtering by specific department, only keep that one
  if (filterDeptId) {
    const filtered = assignmentsByDept.get(filterDeptId);
    assignmentsByDept.clear();
    if (filtered) assignmentsByDept.set(filterDeptId, filtered);
  }

  // Fetch all department details
  const deptIds = Array.from(assignmentsByDept.keys());
  const departments = await Promise.all(deptIds.map(id => departmentService.findUnique({ id })));
  const deptMap = new Map(departments.filter(Boolean).map((d: any) => [d.id, d]));

    // Batch fetch subjects and feedbacks for all assignments
    const assignmentIds = allAssignments.map((a: any) => a.id);
    const uniqueSubjectIds = Array.from(new Set(allAssignments.map((a: any) => a.subjectId).filter(Boolean)));
    const subjects = await Promise.all(uniqueSubjectIds.map((id: any) => subjectService.findUnique({ id })));
    const subjectMap = new Map(subjects.filter(Boolean).map((s: any) => [s.id, s]));
    const feedbacks = assignmentIds.length > 0 ? await feedbackService.findMany({ where: { assignmentId: { $in: assignmentIds } } }) : [];
    const feedbackMap = new Map<string, any[]>();
    for (const f of feedbacks) {
      if (!feedbackMap.has(f.assignmentId)) feedbackMap.set(f.assignmentId, []);
      feedbackMap.get(f.assignmentId)!.push(f);
    }

    const params = [
      "coverage_of_syllabus",
      "covering_relevant_topics_beyond_syllabus",
      "effectiveness_technical_contents",
      "effectiveness_communication_skills",
      "effectiveness_teaching_aids",
      "motivation_self_learning",
      "support_practical_performance",
      "support_project_seminar",
      "feedback_on_student_progress",
      "punctuality_and_discipline",
      "domain_knowledge",
      "interaction_with_students",
      "ability_to_resolve_difficulties",
      "encourage_cocurricular",
      "encourage_extracurricular",
      "guidance_during_internship",
    ];

    // Determine facultyName and academicYear (best-effort: infer from subjects' academic years)
    const facultyName = session.user?.name || session.user?.email || "Unknown";
    const academicYear = allAssignments.length > 0 ? (allAssignments[0].subject?.academicYearId ?? null) : null;

    // Build reports grouped by department
    const departmentReports: any[] = [];
    
    console.log('📊 [Faculty Report] Processing departments:', assignmentsByDept.size);
    
    for (const [deptId, assignments] of assignmentsByDept.entries()) {
      const dept = deptMap.get(deptId);
      const deptReports: any[] = [];
      
      console.log(`📊 [Faculty Report] Department ${deptId} (${dept?.name || 'unknown'}): ${assignments.length} assignments`);
      
      for (const a of assignments) {
        const allFbForAssignment = feedbackMap.get(a.id) || [];
        let fb = [...allFbForAssignment];
        
        console.log(`📊 [Faculty Report] Assignment ${a.id}: ${allFbForAssignment.length} total feedbacks`);
        
        // If the viewer is not an HOD, only include feedbacks that have been released by HOD
        const viewerIsHod = session.user?.role === 'HOD';
        if (!viewerIsHod) {
          fb = fb.filter((f: any) => f.isReleased === true);
          console.log(`📊 [Faculty Report] Assignment ${a.id}: ${fb.length} released feedbacks (after filter)`);
        }

        if (!fb || fb.length === 0) {
          console.log(`📊 [Faculty Report] Assignment ${a.id}: SKIPPED - no released feedbacks`);
          continue;
        }

        const avg: any = {};
        params.forEach((p) => (avg[p] = 0));
        for (const f of fb) {
          params.forEach((p) => (avg[p] += Number((f as any)[p] ?? 0)));
          // Student suggestions are no longer collected for faculty view
        }
        params.forEach((p) => (avg[p] = parseFloat((avg[p] / fb.length).toFixed(2))));

        // overall performance percentage
        const total = params.reduce((s, k) => s + (Number(avg[k]) || 0), 0);
        const overallPercentage = parseFloat(((total / (params.length * 5)) * 100).toFixed(2));

        deptReports.push({ assignmentId: a.id, subject: subjectMap.get(a.subjectId), semester: a.semester, averages: avg, totalResponses: fb.length, overallPercentage });
        console.log(`📊 [Faculty Report] Assignment ${a.id}: ADDED to report with ${fb.length} responses`);
      }

      console.log(`📊 [Faculty Report] Department ${deptId}: ${deptReports.length} reports generated`);

      // Get HOD suggestion for this department (if any)
      const semester = deptReports?.[0]?.semester || '';
      let hodSuggestion = '';
      if (staff?.id && semester) {
        const rows = await hodSuggestionService.findMany({ where: { staffId: staff.id, semester } });
        hodSuggestion = rows && rows.length > 0 ? rows[0].content || '' : '';
      }

      if (deptReports.length > 0) {
        departmentReports.push({
          departmentId: deptId,
          departmentName: dept?.name || 'Unknown Department',
          departmentAbbreviation: dept?.abbreviation || '',
          reports: deptReports,
          hodSuggestion,
          semester,
        });
      }
    }

  // include staffId (inferred from session) so client can request the PDF
  const staffProfile = await staffService.findFirst({ where: { userId: session.user.id } });

  // For backward compatibility, also include a flat reports array (from home department or first available)
  const homeDeptReports = departmentReports.find(d => d.departmentId === staff.departmentId);
  const flatReports = homeDeptReports?.reports || departmentReports[0]?.reports || [];
  const hodSuggestion = homeDeptReports?.hodSuggestion || departmentReports[0]?.hodSuggestion || '';

  // Return both grouped and flat structure
  return NextResponse.json({ 
    facultyName, 
    academicYear, 
    reports: flatReports, // backward compatibility
    departmentReports, // new grouped structure
    staffId: staffProfile?.id, 
    hodSuggestion,
    homeDepartmentId: staff.departmentId, // staff's home department
  });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch faculty report" }, { status: 500 });
  }
}
