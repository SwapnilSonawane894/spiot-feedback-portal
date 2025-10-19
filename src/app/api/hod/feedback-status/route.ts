/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { staffService, departmentService } from "@/lib/firebase-services";

export async function GET() {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user?.role !== "HOD") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const staff = await staffService.findUnique({ where: { userId: session.user.id }, include: { department: true } });
  if (!staff || !staff.department) return NextResponse.json({ error: "Department not found" }, { status: 404 });

  return NextResponse.json({ isFeedbackActive: (staff.department as any).isFeedbackActive });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch status" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user?.role !== "HOD") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json();
    const { isActive } = body || {};
    if (typeof isActive !== "boolean") return NextResponse.json({ error: "isActive must be boolean" }, { status: 400 });

    const staff = await staffService.findUnique({ where: { userId: session.user.id } });
    if (!staff) return NextResponse.json({ error: "Staff profile not found" }, { status: 404 });

  const updated = await departmentService.update({ id: staff.departmentId }, { isFeedbackActive: isActive });

  return NextResponse.json({ success: true, isFeedbackActive: updated.isFeedbackActive });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }
}
