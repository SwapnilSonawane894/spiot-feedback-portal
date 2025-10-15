import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, email, departmentId } = body || {};

    if (!name || !email || !departmentId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Update user
    const updatedUser = await prisma.user.update({ where: { id }, data: { name, email } });

    // Update staff profile (find by userId)
    await prisma.staff.updateMany({ where: { userId: id }, data: { departmentId } });

    const updated = await prisma.user.findUnique({ where: { id }, include: { staffProfile: { include: { department: true } } } });
    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update HOD" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id: userId } = await params;

    await prisma.$transaction(async (tx) => {
      // find staff profile for this user
      const staff = await tx.staff.findFirst({ where: { userId } });
      const staffId = staff?.id;

      if (staffId) {
        // find department where this staff is hod
        const dept = await tx.department.findFirst({ where: { hodId: staffId } });
        if (dept) {
          // unassign hod
          await tx.department.update({ where: { id: dept.id }, data: { hodId: null } });
        }
        // delete any faculty assignments referencing this staff
        await tx.facultyAssignment.deleteMany({ where: { staffId } });
        // delete the staff profile(s) referencing this user
        await tx.staff.deleteMany({ where: { userId } });
      }

      // finally delete the user (cascade will remove staff profile)
      await tx.user.delete({ where: { id: userId } });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete HOD" }, { status: 500 });
  }
}
