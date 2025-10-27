/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import type { Session } from "next-auth";
import { staffService, subjectService, assignmentService } from "@/lib/mongodb-services";
import { departmentSubjectsService } from "@/lib/mongodb-services";
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const session = (await getServerSession(authOptions as any)) as Session | null;
    if (!session || session.user?.role !== "HOD") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hodUserId = session.user.id as string;
    const hodProfile = await staffService.findUnique({ where: { userId: hodUserId } });
    if (!hodProfile) return NextResponse.json({ error: "HOD profile not found" }, { status: 404 });

    const subject = await subjectService.findUnique({ id });
    if (!subject) return NextResponse.json({ error: "Subject not found" }, { status: 404 });

    // The HOD must exist and own a staff profile; that's sufficient to allow edits to
    // subjects for their department. Previously we required an existing faculty
    // assignment in the HOD's department which prevented editing subjects that had
    // no assignments yet. We'll allow the HOD to edit subjects; further checks
    // (e.g., ensuring subject.academicYear matches department policy) can be added
    // later.

    const body = await request.json();
    const { name, subjectCode, academicYearId, semester } = body || {};
    if (!name || !subjectCode || !academicYearId) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    if (semester && (semester < 1 || semester > 6)) {
      return NextResponse.json({ error: "Semester must be between 1 and 6" }, { status: 400 });
    }

  const updateData: any = { name, subjectCode, academicYearId };
  if (semester) {
    updateData.semester = Number(semester);
  }

  const updated = await subjectService.update({ id }, updateData);
  return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update subject" }, { status: 500 });
  }
}

// DELETE: remove a subject (only HODs managing the department may delete)
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = (await getServerSession(authOptions as any)) as Session | null;
    if (!session || session.user?.role !== "HOD") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hodUserId = session.user.id as string;
    const hodProfile = await staffService.findUnique({ where: { userId: hodUserId } });
    if (!hodProfile) return NextResponse.json({ error: "HOD profile not found" }, { status: 404 });

    const subject = await subjectService.findUnique({ id });
    if (!subject) return NextResponse.json({ error: "Subject not found" }, { status: 404 });

  // Allow HODs to delete subjects; no longer require an existing assignment in
  // order to delete. We'll still require the requester to be a HOD (checked above).

    // Important: Do NOT delete the master subject document here. HODs should only be
    // allowed to remove the subject FROM THEIR DEPARTMENT (the departmentSubjects junction)
    // and any faculty assignments tied to THAT junction/department. This prevents
    // accidental removal of the subject for other departments.
    try {
      const db = await getDatabase();
      const hodDeptId = hodProfile.departmentId;

      // First, check whether the provided id refers to a departmentSubjects junction _id
      let junctionRow: any = null;
      try {
        if (/^[0-9a-fA-F]{24}$/.test(id)) {
          junctionRow = await db.collection('departmentSubjects').findOne({ _id: new ObjectId(id) });
        }
      } catch (e) {
        // ignore
      }

      if (junctionRow) {
        // Ensure HOD owns this junction's department
        if (String(junctionRow.departmentId) !== String(hodDeptId)) {
          return NextResponse.json({ error: 'Forbidden: junction does not belong to your department' }, { status: 403 });
        }

        // Delete assignments that reference this junction id and belong to this department
        try {
          await db.collection('facultyAssignments').deleteMany({ subjectId: id, departmentId: String(hodDeptId) });
        } catch (e) {
          console.warn('Failed to delete faculty assignments for junction id', id, e);
        }

        // Delete the junction row itself (department-scoped removal)
        await db.collection('departmentSubjects').deleteOne({ _id: new ObjectId(id), departmentId: String(hodDeptId) });

        console.info(`✅ Deleted subject junction for department ${hodDeptId}, junction ID: ${id}`);
        return NextResponse.json({ success: true });
      }

      // If not a junction id, treat `id` as the master subject id but only unlink it
      // from the HOD's department (do not remove other departments or the master subject)
      const rows = await db.collection('departmentSubjects').find({ departmentId: String(hodDeptId), subjectId: String(id) }).toArray();

      if (!rows || rows.length === 0) {
        // Nothing to unlink for this department
        return NextResponse.json({ error: 'Subject not linked to your department' }, { status: 404 });
      }

      // collect junction ids that will be removed so we can clean up assignments
      const junctionIds = rows.map((r: any) => String(r._id));

      try {
        // delete assignments referencing any of the removed junction ids OR the master id (legacy)
        await db.collection('facultyAssignments').deleteMany({
          departmentId: String(hodDeptId),
          $or: [ { subjectId: { $in: junctionIds } }, { subjectId: String(id) } ]
        });
      } catch (e) {
        console.warn('Failed to delete faculty assignments for subject unlink', id, e);
      }

      // Remove the departmentSubjects rows for this department & subject
      await db.collection('departmentSubjects').deleteMany({ departmentId: String(hodDeptId), subjectId: String(id) });

      console.info(`✅ Unlinked subject ${id} from department ${hodDeptId}. Removed junctions: ${junctionIds.join(',')}`);
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error(error);
      return NextResponse.json({ error: "Failed to delete subject for department" }, { status: 500 });
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete subject" }, { status: 500 });
  }
}
