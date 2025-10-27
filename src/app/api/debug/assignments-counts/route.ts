/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { staffService, subjectService, assignmentService, academicYearService } from "@/lib/mongodb-services";
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET() {
  try {
    // Only enable in non-production to avoid leaking data
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
    }

    const session = (await getServerSession(authOptions as any)) as any;
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Require HOD role for department-scoped debug
    if (session.user?.role !== 'HOD') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const staff = await staffService.findFirst({ where: { userId: session.user.id } });
    if (!staff || !staff.departmentId) return NextResponse.json({ error: 'HOD or department not found' }, { status: 404 });
    const departmentId = staff.departmentId;

    // Use raw DB queries that try both string and ObjectId matches because the stored documents may mix types.
    const db = await getDatabase();

    const tryObjectId = (id: string) => {
      try {
        return new ObjectId(id);
      } catch (e) {
        return null;
      }
    };

    const deptObjId = tryObjectId(departmentId);

    // Fetch subjects belonging to this department (match either string or ObjectId)
    const subjectQuery: any = deptObjId
      ? { $or: [{ departmentId }, { departmentId: deptObjId }] }
      : { departmentId };

    const subjectDocs = await db.collection('subjects').find(subjectQuery).toArray();
    const subjects = subjectDocs.map((d: any) => ({ id: d._id.toString(), name: d.name, academicYearId: d.academicYearId ? d.academicYearId.toString() : null }));
    const subjectIdSet = new Set(subjects.map((s: any) => s.id));

    // Fetch all assignments and filter by subjectId or staff department
    const assignmentDocs = await db.collection('facultyAssignments').find({}).toArray();
    // Normalize assignments (subjectId/staffId may be ObjectId or string)
    const assignments = assignmentDocs.map((d: any) => ({ id: d._id.toString(), subjectId: d.subjectId ? d.subjectId.toString() : null, staffId: d.staffId ? d.staffId.toString() : null }));

    // First try matching by subjectId
    let deptAssignments = assignments.filter((a: any) => a.subjectId && subjectIdSet.has(a.subjectId));

    if (deptAssignments.length === 0) {
      // Fallback: find staff in department and match by staffId
      const deptStaffDocs = await db.collection('staff').find(deptObjId ? { $or: [{ departmentId }, { departmentId: deptObjId }] } : { departmentId }).toArray();
      const deptStaffIds = new Set(deptStaffDocs.map((s: any) => s._id.toString()));
      deptAssignments = assignments.filter((a: any) => a.staffId && deptStaffIds.has(a.staffId));
    }

    const byYear: Record<string, { assignments: number; subjects: number }> = {};

    for (const a of deptAssignments) {
      let yearId = 'unknown';
      if (a.subjectId) {
        const subj = subjects.find((s: any) => s.id === a.subjectId);
        yearId = subj && subj.academicYearId ? subj.academicYearId : 'unknown';
      }
      byYear[yearId] = byYear[yearId] || { assignments: 0, subjects: 0 };
      byYear[yearId].assignments += 1;
    }

    // Count subjects per academic year
    for (const s of subjects) {
      const y = s.academicYearId || 'unknown';
      byYear[y] = byYear[y] || { assignments: 0, subjects: 0 };
      byYear[y].subjects += 1;
    }

    // Resolve academic year names for keys that are not 'unknown'
    const yearIds = Object.keys(byYear).filter(id => id !== 'unknown');
    const yearRows = await Promise.all(yearIds.map((id) => academicYearService.findUnique({ id })));
    const yearMap: Record<string,string> = {};
    yearRows.forEach((r:any) => { if (r) yearMap[r.id] = r.abbreviation || r.name; });

    const human: Record<string, any> = {};
    Object.entries(byYear).forEach(([k, v]) => {
      human[yearMap[k] || k || 'unknown'] = v;
    });

    return NextResponse.json({ departmentId, totalSubjects: subjects.length, totalAssignments: deptAssignments.length, byYear: human });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Debug failed' }, { status: 500 });
  }
}
