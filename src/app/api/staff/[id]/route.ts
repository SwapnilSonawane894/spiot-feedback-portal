/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import type { Session } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { staffService, userService, hodSuggestionService, assignmentService } from "@/lib/mongodb-services";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const session = (await getServerSession(authOptions as any)) as Session | null;
    if (!session || !["ADMIN", "HOD"].includes(session.user?.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const staffProfile = await staffService.findUnique({ where: { id } });
    if (!staffProfile) return NextResponse.json({ error: "Staff not found" }, { status: 404 });

    if (session.user.role === "HOD") {
      const hodUserId = session.user.id as string;
      const hodProfile = await staffService.findUnique({ where: { userId: hodUserId } });
      if (!hodProfile) return NextResponse.json({ error: "HOD profile not found" }, { status: 404 });

      if (staffProfile.departmentId !== hodProfile.departmentId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const body = await request.json();
    const { name, email, departmentId } = body;

    if (name || email) {
      const updateData: any = {};
      if (name) updateData.name = name;
      if (email) updateData.email = email;
      
      await userService.update({ id: staffProfile.userId }, updateData);
    }

    if (departmentId !== undefined) {
      await staffService.update({ id }, { departmentId });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update staff" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = (await getServerSession(authOptions as any)) as Session | null;
    if (!session || !["ADMIN", "HOD"].includes(session.user?.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const staff = await staffService.findUnique({ where: { id } });
    if (!staff) return NextResponse.json({ error: "Staff not found" }, { status: 404 });

    if (session.user.role === "HOD") {
      const hodUserId = session.user.id as string;
      const hodProfile = await staffService.findUnique({ where: { userId: hodUserId } });
      if (!hodProfile) return NextResponse.json({ error: "HOD profile not found" }, { status: 404 });

      if (staff.departmentId !== hodProfile.departmentId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    try {
      await hodSuggestionService.deleteMany({ staffId: staff.id });
      await assignmentService.deleteMany({ staffId: staff.id });
      await userService.delete({ id: staff.userId });
    } catch (err) {
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
