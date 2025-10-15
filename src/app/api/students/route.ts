/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";

export async function POST(request: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session || (session.user?.role !== "HOD" && session.user?.role !== "ADMIN")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { fullName, enrollment, academicYearId } = body || {};
    if (!fullName || !enrollment || !academicYearId) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    // Find HOD's department
    const staff = await prisma.staff.findUnique({ where: { userId: session.user.id } });
    if (!staff) return NextResponse.json({ error: "HOD profile not found" }, { status: 404 });

    const deptId = staff.departmentId;

    // check existing user
    const existing = await prisma.user.findUnique({ where: { email: enrollment } });
    if (existing) return NextResponse.json({ error: "User already exists" }, { status: 409 });

    const hashed = await bcrypt.hash(enrollment, 10);

    const created = await prisma.user.create({
      data: {
        email: enrollment,
        name: fullName,
        hashedPassword: hashed,
        role: 'STUDENT',
        departmentId: deptId,
        academicYearId,
      },
    });

    return NextResponse.json({ success: true, id: created.id });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error?.message || "Failed to create student" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session || session.user?.role !== "HOD") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hodUserId = session.user.id as string;
    const hodProfile = await prisma.staff.findUnique({ where: { userId: hodUserId } });
    if (!hodProfile) return NextResponse.json({ error: "HOD profile not found" }, { status: 404 });

    const students = await prisma.user.findMany({ where: { departmentId: hodProfile.departmentId, role: "STUDENT" }, select: { id: true, name: true, email: true, academicYearId: true } });

    return NextResponse.json(students);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 });
  }
}
