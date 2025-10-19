/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { staffService, userService } from "@/lib/firebase-services";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session || session.user?.role !== "HOD") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    // Ensure HOD belongs to a department and optionally validate ownership
    const hodProfile = await staffService.findUnique({ where: { userId: session.user.id } });
    if (!hodProfile) return NextResponse.json({ error: "HOD profile not found" }, { status: 404 });

    // Optionally ensure the student belongs to same department — we'll delete only if student's department matches HOD's
    const student = await userService.findUnique({ id });
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });
    if (student.departmentId !== hodProfile.departmentId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await userService.delete({ id });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete student" }, { status: 500 });
  }
}
