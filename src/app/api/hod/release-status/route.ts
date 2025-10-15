/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user?.role !== "HOD") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const staff = await prisma.staff.findUnique({ where: { userId: session.user.id }, include: { department: true } });
    if (!staff || !staff.department) return NextResponse.json({ error: "Department not found" }, { status: 404 });

    // Check the first feedback in the department to infer release status
    const firstFeedback = await prisma.feedback.findFirst({
      where: { assignment: { staff: { departmentId: staff.departmentId } } },
      orderBy: { createdAt: 'asc' },
    });

    const isReleased = firstFeedback ? firstFeedback.isReleased : false;
    return NextResponse.json({ isReleased });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch release status" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user?.role !== "HOD") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json();
    const { shouldBeReleased } = body || {};
    if (typeof shouldBeReleased !== 'boolean') return NextResponse.json({ error: 'shouldBeReleased must be boolean' }, { status: 400 });

    const staff = await prisma.staff.findUnique({ where: { userId: session.user.id } });
    if (!staff) return NextResponse.json({ error: "Staff profile not found" }, { status: 404 });

    // Bulk update all feedbacks for assignments where the staff belongs to this department
    const result = await prisma.feedback.updateMany({
      where: { assignment: { staff: { departmentId: staff.departmentId } } },
      data: { isReleased: shouldBeReleased },
    });

    return NextResponse.json({ success: true, updated: result.count, isReleased: shouldBeReleased });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update release status" }, { status: 500 });
  }
}
