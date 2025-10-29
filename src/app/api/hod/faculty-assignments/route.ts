/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { staffService, assignmentService, subjectService, departmentSubjectsService, normalizeSemester } from "@/lib/mongodb-services";
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';


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
    let semester;
    try {
      const url = new URL(request.url);
      const s = url.searchParams.get('semester');
      if (s) semester = s;
    } catch (e) {
      // ignore URL parse errors and use default semester
    }

  // Request received for faculty assignments

    // Normalize semester before querying - UI passes human-friendly strings like "Odd 2025-26"
    // while DB stores normalized values (we canonicalize on write). Use normalizeSemester to
    // ensure the HOD GET fetches the same canonical semester values that assignments use.
    const semesterNormalized = normalizeSemester(semester);

    // Fetch assignments for the current (normalized) semester that were created by this department
    const allAssignments = await assignmentService.findMany({ where: { semester: semesterNormalized, departmentId } });
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
    const semester = body?.semester ?? "Odd 2025-26";
    const assignments = Array.isArray(body?.assignments) ? body.assignments : [];

    const hodUserId = session.user.id as string;
    const hodProfile = await staffService.findUnique({ where: { userId: hodUserId } });
    if (!hodProfile) return NextResponse.json({ error: "HOD profile not found" }, { status: 404 });

    const departmentId = hodProfile.departmentId;

    // Get department's subjects (may include academicYear info on the subject)
    const deptJunctionRows = await departmentSubjectsService.findSubjectsForDepartment(departmentId, { include: { academicYear: true } });
    const deptSubjectIds = new Set((deptJunctionRows || []).map((r: any) => String(r.id)).filter(Boolean));

    // We'll perform a safe diff-and-upsert approach instead of deleting all rows then recreating.
    // Rationale: avoid temporarily removing assignments (which can create gaps) and prevent duplicate inserts
    // when HOD does remove->add cycles. We'll only operate on assignments for this department + semester
    // and only for subjects that belong to this department.

    // Only accept assignments for subjects that belong to this department
    const filteredAssignments = Array.isArray(assignments)
      ? assignments.filter((a: any) => deptSubjectIds.has(String(a.subjectId)))
      : [];

    // Fetch subject master docs to obtain their academicYearId (fallback)
    const subjectIds = Array.from(new Set(filteredAssignments.map((a: any) => String(a.subjectId)).filter(Boolean)));
    const subjectDetails = subjectIds.length ? await subjectService.findMany({ where: { id: { $in: subjectIds } } }) : [];
    const subjectYearMap = new Map(subjectDetails.map((s: any) => [s.id, s.academicYearId]));

    // Build a map from subjectId -> junction academicYearId (if present on departmentSubjects lookup)
    const junctionYearMap = new Map((deptJunctionRows || []).map((r: any) => [String(r.id), r.academicYearId || (r.academicYear?.id ?? null)]));

    const db = await getDatabase();

    // Fetch existing assignments for this department+semester limited to the department's subjects
    const existingFilter: any = { departmentId, semester: normalizeSemester(semester) };
    if (deptSubjectIds.size > 0) existingFilter.subjectId = { $in: Array.from(deptSubjectIds) };
    const existingRaw = await db.collection('facultyAssignments').find(existingFilter).toArray();

    // Build maps keyed by staffId:subjectId:semester for quick comparison
    const existingMap = new Map<string, any>();
    for (const ex of existingRaw) {
      const key = `${String(ex.staffId)}:${String(ex.subjectId)}:${String(normalizeSemester(ex.semester))}`;
      existingMap.set(key, ex);
    }

    // Desired set and de-duplication
    const desiredMap = new Map<string, any>();
    for (const a of filteredAssignments) {
      const staffId = String(a.staffId);
      const subjectId = String(a.subjectId);
      const sem = normalizeSemester(semester);
      const key = `${staffId}:${subjectId}:${sem}`;
      if (desiredMap.has(key)) continue; // de-duplicate incoming payload

      const academicYearId = junctionYearMap.get(String(subjectId)) || subjectYearMap.get(subjectId) || null;

      desiredMap.set(key, {
        staffId,
        subjectId,
        semester: sem,
        departmentId: String(departmentId),
        academicYearId,
        updatedAt: new Date(),
      });
    }

  // Truncate existing assignments for this department+semester (department-scoped truncate)
  // This implements the requested behaviour: when HOD clicks "Save all assignments" we remove
  // the existing rows for this department and semester and re-insert the incoming set, preventing
  // lingering duplicates caused by remove->add flows. NOTE: deletion is scoped to the department
  // and semester and the department's subjects.
  let created = 0;
  let updated = 0;
  let deleted = 0;

  const famCol = db.collection('facultyAssignments');
  const semNormalized = normalizeSemester(semester);

  const deleteFilter: any = { departmentId: String(departmentId), semester: semNormalized };
  if (deptSubjectIds.size > 0) deleteFilter.subjectId = { $in: Array.from(deptSubjectIds) };

  // Backup is done by external scripts; here we perform the deletion as requested.
  const delRes = await famCol.deleteMany(deleteFilter);
  deleted += delRes.deletedCount ?? 0;

  // Insert desired rows in one batch
  const docsToInsert: any[] = [];
  const now = new Date();
  for (const [k, v] of desiredMap.entries()) {
    docsToInsert.push({
      staffId: v.staffId,
      subjectId: v.subjectId,
      semester: v.semester,
      departmentId: v.departmentId,
      academicYearId: v.academicYearId ?? null,
      createdAt: now,
      updatedAt: now,
    });
  }

  if (docsToInsert.length) {
    const ins = await famCol.insertMany(docsToInsert);
    created = ins.insertedCount ?? docsToInsert.length;
  }

  return NextResponse.json({ success: true, created, updated, deleted, total: desiredMap.size });
  } catch (error: any) {
    console.error("API /hod/faculty-assignments POST error:", error);
    return NextResponse.json({ error: error?.message || "Failed to save assignments" }, { status: 500 });
  }
}
