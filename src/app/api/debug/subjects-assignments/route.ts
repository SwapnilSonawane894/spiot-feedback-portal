import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { subjectService, assignmentService, staffService } from '@/lib/mongodb-services';

// Dev-only diagnostic endpoint to inspect subjects, assignments and assigned staff for the HOD's department
export async function GET(req: Request) {
  try {
    if (process.env.NODE_ENV === 'production') return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 });
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.user?.role !== 'HOD') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const hodProfile = await staffService.findFirst({ where: { userId: session.user.id } });
    if (!hodProfile) return NextResponse.json({ error: 'HOD profile not found' }, { status: 404 });
    const departmentId = hodProfile.departmentId;

    const subjects = await subjectService.findMany();
    const deptSubjects = subjects.filter((s: any) => String(s.departmentId) === String(departmentId));
    const subjectsMissingDept = subjects.filter((s: any) => !s.departmentId || String(s.departmentId) !== String(departmentId));

    const assignments = await assignmentService.findMany({});
    const assignmentsForDeptSubjects = assignments.filter((a: any) => a.subjectId && deptSubjects.some((s: any) => String(s.id) === String(a.subjectId)));

    // Unique staff ids assigned to dept subjects
    const assignedStaffIds = Array.from(new Set(assignmentsForDeptSubjects.map((a: any) => a.staffId).filter(Boolean)));
    const assignedStaff = await Promise.all(assignedStaffIds.map((id: string) => staffService.findUnique({ where: { id }, include: { user: true, department: true } })));

    return NextResponse.json({
      departmentId,
      totalSubjects: subjects.length,
      deptSubjectsCount: deptSubjects.length,
      deptSubjects,
      subjectsMissingDeptCount: subjectsMissingDept.length,
      subjectsMissingDept,
      totalAssignments: assignments.length,
      assignmentsForDeptSubjectsCount: assignmentsForDeptSubjects.length,
      assignmentsForDeptSubjects,
      assignedStaffCount: assignedStaff.length,
      assignedStaff,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch diagnostics' }, { status: 500 });
  }
}
