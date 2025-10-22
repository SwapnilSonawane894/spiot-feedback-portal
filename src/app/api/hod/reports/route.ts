import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { staffService, userService, assignmentService, subjectService, feedbackService } from "@/lib/mongodb-services";

export async function GET() {
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
    for (const a of (allAssignments || [])) {
      if (a.subjectId && deptSubjectIds.has(String(a.subjectId))) {
        if (a.staffId) assignedStaffIds.add(a.staffId);
      }
    }

    // 3) fetch department staff and also any assigned staff (avoid duplicates)
    const deptStaff = await staffService.findMany({ where: { departmentId } });
    const deptStaffIds = new Set((deptStaff || []).map((d: any) => d.id));

    const extraStaffIds = Array.from(assignedStaffIds).filter((id) => !deptStaffIds.has(id));
  const extraStaff = extraStaffIds.length > 0 ? await Promise.all(extraStaffIds.map((id) => staffService.findUnique({ where: { id }, include: { user: true, department: true } }))) : [];

  // Merge and dedupe by staff id
  const staffMap = new Map<string, any>();
  for (const s of deptStaff) staffMap.set(s.id, s);
  for (const s of extraStaff) if (s) staffMap.set(s.id, s);
  const staffList = Array.from(staffMap.values());

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
      // Fetch user and assignments for this staff member
      const user = await userService.findUnique({ id: s.userId });
      const assignments = await assignmentService.findMany({ where: { staffId: s.id } });
      
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

    return NextResponse.json({ reports });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
  }
}
