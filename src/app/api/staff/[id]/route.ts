/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import type { Session } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

// PATCH: update the staff's user (name/email) — only HODs from same department may update
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const session = (await getServerSession(authOptions as any)) as Session | null;
    if (!session || session.user?.role !== "HOD") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ensure HOD belongs to same department as the staff being updated
    const hodUserId = session.user.id as string;
    const hodProfile = await prisma.staff.findUnique({ where: { userId: hodUserId } });
    if (!hodProfile) return NextResponse.json({ error: "HOD profile not found" }, { status: 404 });

    const staffProfile = await prisma.staff.findUnique({ where: { id } });
    if (!staffProfile) return NextResponse.json({ error: "Staff not found" }, { status: 404 });

    if (staffProfile.departmentId !== hodProfile.departmentId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, email } = body || {};
    if (!name || !email) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    // update the underlying user record
    await prisma.user.update({ where: { id: staffProfile.userId }, data: { name, email } });

    const updatedStaff = await prisma.staff.findUnique({ where: { id }, include: { user: true } });
    return NextResponse.json(updatedStaff);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update staff" }, { status: 500 });
  }
}

// DELETE: remove a staff profile and its user — only HODs from same department may delete
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = (await getServerSession(authOptions as any)) as Session | null;
    if (!session || session.user?.role !== "HOD") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const hodUserId = session.user.id as string;
    const hodProfile = await prisma.staff.findUnique({ where: { userId: hodUserId } });
    if (!hodProfile) return NextResponse.json({ error: "HOD profile not found" }, { status: 404 });

    const staff = await prisma.staff.findUnique({ where: { id } });
    if (!staff) return NextResponse.json({ error: "Staff not found" }, { status: 404 });

    if (staff.departmentId !== hodProfile.departmentId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Remove related records (assignments, HOD suggestions) and then delete staff + user
    // Do this in a transaction to avoid partial deletes and foreign-key constraint errors.
    try {
      await prisma.$transaction([
        // delete any HOD suggestions tied to this staff
        prisma.hodSuggestion.deleteMany({ where: { staffId: staff.id } }),
        // delete any assignments for the staff
        prisma.facultyAssignment.deleteMany({ where: { staffId: staff.id } }),
        // delete staff profile
        prisma.staff.delete({ where: { id: staff.id } }),
        // delete underlying user
        prisma.user.delete({ where: { id: staff.userId } }),
      ]);
    } catch (err) {
      // Log and return a clearer error for the client
      console.error('Failed while deleting related records or staff/user:', err);
      const msg = (err && (err as any).message) ? (err as any).message : 'Failed to delete staff';
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete staff" }, { status: 500 });
  }
}
