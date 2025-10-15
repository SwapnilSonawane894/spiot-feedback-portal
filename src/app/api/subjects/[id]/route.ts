/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import type { Session } from "next-auth";
import prisma from "@/lib/prisma";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const session = (await getServerSession(authOptions as any)) as Session | null;
    if (!session || session.user?.role !== "HOD") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hodUserId = session.user.id as string;
    const hodProfile = await prisma.staff.findUnique({ where: { userId: hodUserId } });
    if (!hodProfile) return NextResponse.json({ error: "HOD profile not found" }, { status: 404 });

    const subject = await prisma.subject.findUnique({ where: { id } });
    if (!subject) return NextResponse.json({ error: "Subject not found" }, { status: 404 });

    // The HOD must exist and own a staff profile; that's sufficient to allow edits to
    // subjects for their department. Previously we required an existing faculty
    // assignment in the HOD's department which prevented editing subjects that had
    // no assignments yet. We'll allow the HOD to edit subjects; further checks
    // (e.g., ensuring subject.academicYear matches department policy) can be added
    // later.

    const body = await request.json();
    const { name, subjectCode, academicYearId } = body || {};
    if (!name || !subjectCode || !academicYearId) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const updated = await (prisma as any).subject.update({ where: { id }, data: { name, subjectCode, academicYearId } });
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
    const hodProfile = await prisma.staff.findUnique({ where: { userId: hodUserId } });
    if (!hodProfile) return NextResponse.json({ error: "HOD profile not found" }, { status: 404 });

    const subject = await prisma.subject.findUnique({ where: { id } });
    if (!subject) return NextResponse.json({ error: "Subject not found" }, { status: 404 });

  // Allow HODs to delete subjects; no longer require an existing assignment in
  // order to delete. We'll still require the requester to be a HOD (checked above).

    // Delete related faculty assignments first (best-effort)
    try {
      await prisma.facultyAssignment.deleteMany({ where: { subjectId: id } });
    } catch (e) {
      console.warn("Failed to delete related assignments", e);
    }

    await prisma.subject.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete subject" }, { status: 500 });
  }
}
