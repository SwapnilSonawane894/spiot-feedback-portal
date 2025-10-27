/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { staffService, subjectService, academicYearService, departmentSubjectsService } from "@/lib/mongodb-services";

export async function GET(request: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session || session.user?.role !== "HOD") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

  const hodUserId = session.user.id as string;
  const hodProfile = await staffService.findUnique({ where: { userId: hodUserId } });
  if (!hodProfile) return NextResponse.json({ error: "HOD profile not found. Ensure your user has an associated staff profile." }, { status: 404 });

    const departmentId = hodProfile.departmentId;

  // Only return subjects for this HOD's department (use departmentSubjects junction)
  let subjects = await departmentSubjectsService.findSubjectsForDepartment(departmentId, { include: { academicYear: true } });
  // preserve ordering by name asc
  subjects = (subjects || []).sort((a: any, b: any) => {
    const an = (a?.name || '').toString();
    const bn = (b?.name || '').toString();
    return an.localeCompare(bn);
  });
  // Debug logging for GET /api/subjects
  try {
    console.log('📋 GET /api/subjects - Returning subjects:');
    console.log('  Count:', subjects.length);
    if (subjects.length > 0) {
      console.log('  First subject:', JSON.stringify(subjects[0], null, 2));
    }
  } catch (e) {
    // swallow logging errors
  }

  return NextResponse.json(subjects);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch subjects" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session || (session.user && session.user.role !== "HOD")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hodUserId = session.user.id as string;
    const hodProfile = await staffService.findUnique({ where: { userId: hodUserId } });
    if (!hodProfile) return NextResponse.json({ error: "HOD profile not found" }, { status: 404 });

    const body = await request.json();
  let { name, subjectCode, academicYearId } = body || {};
    // Debug logging to help troubleshoot client/server mismatch when subjects
    // appear to already exist despite checking "Link to existing subject if found".
    try {
      console.debug("[POST /api/subjects] incoming body:", { name, subjectCode, academicYearId, rawSemester: body?.semester });
    } catch (e) {
      console.debug("[POST /api/subjects] incoming body (failed to stringify)");
    }
    // Accept semester from caller and coerce to a number when present
    let semester: number | undefined = undefined;
    if (body && body.semester !== undefined && body.semester !== null) {
      semester = Number(body.semester);
      if (Number.isNaN(semester)) {
        return NextResponse.json({ error: "Invalid semester value" }, { status: 400 });
      }
      // Basic validation to keep semesters in expected range (1-6)
      if (semester < 1 || semester > 6) {
        return NextResponse.json({ error: "Semester must be between 1 and 6" }, { status: 400 });
      }
    }
    name = typeof name === 'string' ? name.trim() : name;
    subjectCode = typeof subjectCode === 'string' ? subjectCode.trim().toUpperCase() : subjectCode;

    if (!name || !subjectCode || !academicYearId) {
      return NextResponse.json({ error: "Missing required fields: name, subjectCode, academicYearId are required" }, { status: 400 });
    }

    const year = await academicYearService.findUnique({ id: academicYearId });
    if (!year) return NextResponse.json({ error: `AcademicYear not found for id=${academicYearId}` }, { status: 400 });

  const existing = await subjectService.findUniqueByCode(subjectCode);
  if (existing) {
      try {
        console.debug("[POST /api/subjects] existing subject found:", { id: existing.id, subjectCode: existing.subjectCode, semester: existing.semester, departmentId: existing.departmentId, departmentIds: existing.departmentIds });
      } catch (e) {
        console.debug("[POST /api/subjects] existing subject found (could not stringify)");
      }
    }
    if (existing) {
      const deptId = hodProfile.departmentId;
      // Check link existence in departmentSubjects collection rather than subject.departmentId
      const alreadyLinked = await departmentSubjectsService.linkExists(deptId, existing.id);

      // If already linked to this department, return conflict to the client
      if (alreadyLinked) {
        return NextResponse.json({ error: 'This subject is already in your department' }, { status: 409 });
      }

      // Not yet linked: create departmentSubjects link and optionally update subject's semester/academicYear
      try {
        const linkRes = await departmentSubjectsService.linkSubjectToDepartment({ departmentId: deptId, subjectId: existing.id, academicYearId: academicYearId || null });
        const updateFields: any = {};
        if (semester !== undefined && (existing.semester === undefined || existing.semester === null)) updateFields.semester = semester;
        if (academicYearId && existing.academicYearId !== academicYearId) updateFields.academicYearId = academicYearId;
  let returnedSubject = existing;
        if (Object.keys(updateFields).length > 0) {
          try {
            returnedSubject = await subjectService.update({ id: existing.id }, updateFields);
          } catch (err: any) {
            console.error("Failed to update subject after linking department:", err);
          }
        }
        // Enrich returned subject with junction id and academicYear object
        try {
          const subjDoc = await subjectService.findUnique({ id: returnedSubject.id });
          const enriched: any = {
            _id: subjDoc.id,
            id: subjDoc.id,
            name: subjDoc.name,
            subjectCode: subjDoc.subjectCode,
            semester: subjDoc.semester,
            departmentId: subjDoc.departmentId || deptId,
            _junctionId: linkRes?.insertedId || null,
            createdAt: subjDoc.createdAt || null,
            updatedAt: new Date(),
            academicYear: year ? { _id: year.id, id: year.id, name: year.name, abbreviation: year.abbreviation, year: year.year } : null,
          };
          // Debug logging for POST link-existing-subject response
          try {
            console.log('📤 POST /api/subjects - Returning subject:');
            console.log(JSON.stringify({ subject: enriched, created: false, attachedToDepartment: true }, null, 2));
          } catch (e) {
            // ignore stringify/log errors
          }

          return NextResponse.json({ subject: enriched, created: false, attachedToDepartment: true }, { status: 200 });
        } catch (e) {
          // Debug logging for POST link-existing-subject (fallback response)
          try {
            console.log('📤 POST /api/subjects - Returning subject (fallback):');
            console.log(JSON.stringify({ subject: returnedSubject, created: false, attachedToDepartment: true }, null, 2));
          } catch (ee) {
            // ignore
          }
          return NextResponse.json({ subject: returnedSubject, created: false, attachedToDepartment: true }, { status: 200 });
        }
      } catch (err: any) {
        console.error("Failed to attach department to existing subject:", err);
        return NextResponse.json({ error: err?.message || "Failed to attach department to existing subject" }, { status: 500 });
      }
    }

    try {
      const createPayload: any = {
        name,
        subjectCode,
        academicYearId,
        departmentId: hodProfile.departmentId,
      };
      if (semester !== undefined) createPayload.semester = semester;

      const newSubject = await subjectService.create(createPayload);

      // Auto-link the new subject to the HOD's department so it appears
      // immediately in department-scoped GET calls.
      try {
        const linkRes = await departmentSubjectsService.linkSubjectToDepartment({
          // Use HOD's profile departmentId (hodProfile) rather than session.user.departmentId
          // session.user.departmentId may be undefined which would be stored as the string "undefined"
          departmentId: hodProfile.departmentId,
          subjectId: newSubject.id,
          academicYearId: body.academicYearId || null,
        });
        // Fetch fresh subject doc to include createdAt etc.
        const subjDoc = await subjectService.findUnique({ id: newSubject.id });
        const enrichedNew: any = {
          _id: subjDoc.id,
          id: subjDoc.id,
          name: subjDoc.name,
          subjectCode: subjDoc.subjectCode,
          semester: subjDoc.semester,
          departmentId: subjDoc.departmentId || session.user.departmentId,
          _junctionId: linkRes?.insertedId || null,
          createdAt: subjDoc.createdAt || null,
          updatedAt: subjDoc.updatedAt || null,
          academicYear: year ? { _id: year.id, id: year.id, name: year.name, abbreviation: year.abbreviation, year: year.year } : null,
        };
        // Debug logging for POST create-new-subject response
        try {
          console.log('📤 POST /api/subjects - Returning subject:');
          console.log(JSON.stringify({ subject: enrichedNew, created: true, attachedToDepartment: true }, null, 2));
        } catch (e) {
          // ignore
        }

        return NextResponse.json({ subject: enrichedNew, created: true, attachedToDepartment: true }, { status: 201 });
      } catch (linkErr: any) {
        console.error("Failed to auto-link new subject to department:", linkErr);
        // Even if linking fails, return the created subject. Mark attachedToDepartment false.
        try {
          console.log('📤 POST /api/subjects - Returning subject (created, linking failed):');
          console.log(JSON.stringify({ subject: newSubject, created: true, attachedToDepartment: false }, null, 2));
        } catch (e) { }
        return NextResponse.json({ subject: newSubject, created: true, attachedToDepartment: false }, { status: 201 });
      }
    } catch (err: any) {
      console.error("Failed to create subject:", err);
      return NextResponse.json({ error: err?.message || "Failed to create subject" }, { status: 500 });
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create subject" }, { status: 500 });
  }
}
