import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user?.role !== "HOD") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const staff = await prisma.staff.findFirst({ where: { userId: session.user.id } });
    if (!staff) return NextResponse.json({ error: "HOD profile not found" }, { status: 404 });

    // find assignments for department
    const staffList = await prisma.staff.findMany({ where: { departmentId: staff.departmentId } });
    const staffIds = staffList.map((s) => s.id);

    const assignments = await prisma.facultyAssignment.findMany({ where: { staffId: { in: staffIds } }, select: { id: true } });
    const assignmentIds = assignments.map((a) => a.id);

    if (assignmentIds.length === 0) return NextResponse.json({ success: true, released: 0 });

  const result = await prisma.feedback.updateMany({ where: { assignmentId: { in: assignmentIds } }, data: ({ isReleased: true } as any) });

    return NextResponse.json({ success: true, released: result.count });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to release feedback" }, { status: 500 });
  }
}
