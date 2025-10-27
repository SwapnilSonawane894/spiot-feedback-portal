/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { staffService, assignmentService, subjectService } from "@/lib/mongodb-services";
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

const CURRENT_SEMESTER = "Odd 2025-26";

export async function GET(request: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session || session.user?.role !== "HOD") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hodUserId = session.user.id as string;
    const hodProfile = await staffService.findUnique({ where: { userId: hodUserId } });
    if (!hodProfile) return NextResponse.json({ error: "HOD profile not found" }, { status: 404 });

    const departmentId = hodProfile.departmentId;

    // Allow semester override via query param, fall back to CURRENT_SEMESTER
    let semester = CURRENT_SEMESTER;
    try {
      const url = new URL(request.url);
      const s = url.searchParams.get('semester');
      if (s) semester = s;
    } catch (e) {
      // ignore URL parse errors and use default semester
    }

  // Request received for faculty assignments

    // Fetch assignments for the current semester that were created by this department
    const allAssignments = await assignmentService.findMany({ where: { semester, departmentId } });
    // assignments fetched

    // Collect unique subjectIds from assignments
    const subjectIdStrs = Array.from(new Set((allAssignments || []).map((a: any) => String(a.subjectId)).filter(Boolean)));
    if (subjectIdStrs.length === 0) {
      return NextResponse.json([]);
    }

    // Query subjects collection directly to get subjectCode for these subjectIds
    const db = await getDatabase();
    const objectIds: any[] = [];
    const stringIds: any[] = [];
    for (const sid of subjectIdStrs) {
      if (/^[0-9a-fA-F]{24}$/.test(sid)) {
        try { objectIds.push(new ObjectId(sid)); } catch (e) { stringIds.push(sid); }
      } else {
        stringIds.push(sid);
      }
    }

    const orClauses: any[] = [];
    if (objectIds.length) orClauses.push({ _id: { $in: objectIds } });
    if (stringIds.length) orClauses.push({ _id: { $in: stringIds } });

    const subjectsRaw = (orClauses.length === 0) ? [] : await db.collection('subjects').find(orClauses.length === 1 ? orClauses[0] : { $or: orClauses }).toArray();
    const subjectIdToCode: Record<string, string> = {};
    subjectsRaw.forEach((s: any) => {
      const key = s._id?.toString() || s.id;
      if (s.subjectCode) subjectIdToCode[String(key)] = s.subjectCode;
    });

  // subject code map built

    const enriched = (allAssignments || []).map((a: any) => ({ ...a, subjectCode: subjectIdToCode[String(a.subjectId)] || null }));

    // Additionally limit to department's junction subject ids to be safe
    const deptSubjects = await (await import('@/lib/mongodb-services')).departmentSubjectsService.findSubjectsForDepartment(departmentId);
    const deptSubjectIds = new Set(deptSubjects.map((s: any) => String(s.id)));
    const deptAssignments = enriched.filter((a: any) => a.subjectId && deptSubjectIds.has(String(a.subjectId)));

  // returning enriched, department-scoped assignments

    return NextResponse.json(deptAssignments);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch assignments" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session || session.user?.role !== "HOD") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const semester = body?.semester ?? CURRENT_SEMESTER;
    const assignments = Array.isArray(body?.assignments) ? body.assignments : [];

    const hodUserId = session.user.id as string;
    const hodProfile = await staffService.findUnique({ where: { userId: hodUserId } });
    if (!hodProfile) return NextResponse.json({ error: "HOD profile not found" }, { status: 404 });

  const departmentId = hodProfile.departmentId;

  // Delete existing assignments for this semester limited to this HOD's department subjects
  // Use departmentSubjects junction to find subject ids for this department (subjects may no longer carry departmentId)
  const deptJunctionRows = await (await import('@/lib/mongodb-services')).departmentSubjectsService.findSubjectsForDepartment(departmentId, { include: { academicYear: true } });
  const deptSubjectIds = (deptJunctionRows || []).map((r: any) => String(r.id)).filter(Boolean);
  // build delete filter: always include departmentId to avoid global deletes; include subjectId $in when available
  const deleteFilter: any = { semester, departmentId };
  if (deptSubjectIds.length) deleteFilter.subjectId = { $in: deptSubjectIds };

  // deleting existing assignments for semester (department-limited)
  const deleteResult = await assignmentService.deleteMany(deleteFilter);
  // deleted existing assignments

    // Create new assignments
    let createResult = null;
    if (assignments.length > 0) {
      // Only create assignments for subjects that belong to this HOD's department
      const deptSubjectSet = new Set(deptSubjectIds.map(String));

      const filtered = assignments.filter((a: any) => deptSubjectSet.has(String(a.subjectId)));

      // Build a map subjectId -> junction row (to get the department-specific academicYear)
      const junctionMap = new Map<string, any>();
      for (const jr of deptJunctionRows || []) {
        if (jr && jr.id) junctionMap.set(String(jr.id), jr);
      }

      // For subjects where junction doesn't carry academicYear, batch-fetch master subject docs to fallback
      const needSubjectLookup = new Set<string>();
      for (const a of filtered) {
        const sid = String(a.subjectId);
        const jun = junctionMap.get(sid);
        if (!jun || !(jun.academicYear || jun.academicYearId)) {
          needSubjectLookup.add(sid);
        }
      }

      const subjectAcademicMap = new Map<string, string | null>();
      if (needSubjectLookup.size > 0) {
        const db = await getDatabase();
        const objIds = [];
        const stringIds = [];
        for (const s of Array.from(needSubjectLookup)) {
          if (/^[0-9a-fA-F]{24}$/.test(s)) objIds.push(new ObjectId(s)); else stringIds.push(s);
        }
        const orClauses = [];
        if (objIds.length) orClauses.push({ _id: { $in: objIds } });
        if (stringIds.length) orClauses.push({ _id: { $in: stringIds } });
        if (orClauses.length > 0) {
          const queryFilter: any = orClauses.length === 1 ? orClauses[0] : { $or: orClauses };
          const subjectsRaw = await db.collection('subjects').find(queryFilter).toArray();
          for (const s of subjectsRaw) {
            const key = s._id?.toString() || s.id;
            subjectAcademicMap.set(String(key), s.academicYearId ? String(s.academicYearId) : (s.academicYear ? String(s.academicYear.id || s.academicYear._id) : null));
          }
        }
      }

      const createData = filtered.map((a: any) => {
        const sid = String(a.subjectId);
        const jun = junctionMap.get(sid);
        const junYear = jun ? (jun.academicYear ? (jun.academicYear.id || jun.academicYear._id) : (jun.academicYearId || null)) : null;
        const subjYear = subjectAcademicMap.has(sid) ? subjectAcademicMap.get(sid) : null;
        const academicYearId = junYear ? String(junYear) : (subjYear ? String(subjYear) : (a.academicYearId ? String(a.academicYearId) : null));

        return {
          staffId: a.staffId,
          subjectId: a.subjectId,
          semester,
          departmentId,
          academicYearId
        };
      });

      // create new assignments rows
      createResult = await assignmentService.createMany({ data: createData });
    }

    return NextResponse.json({
      success: true,
      deleted: deleteResult.count,
      created: createResult?.count ?? 0,
    });
  } catch (error: any) {
    console.error("API /hod/faculty-assignments POST error:", error);
    return NextResponse.json({ error: error?.message || "Failed to save assignments" }, { status: 500 });
  }
}
