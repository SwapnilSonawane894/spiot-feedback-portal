/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { staffService, userService } from "@/lib/mongodb-services";
import bcrypt from "bcrypt";
import { sanitizeString, sanitizeEnrollmentNumber } from "@/lib/security-utils";

export async function POST(request: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session || (session.user?.role !== "HOD" && session.user?.role !== "ADMIN")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { fullName, enrollment, academicYearId } = body || {};
    if (!fullName || !enrollment || !academicYearId) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    let sanitizedEnrollment: string;
    let sanitizedFullName: string;
    
    try {
      sanitizedEnrollment = sanitizeEnrollmentNumber(enrollment);
      sanitizedFullName = sanitizeString(fullName);
      
      if (!sanitizedFullName || sanitizedFullName.length < 2) {
        return NextResponse.json({ error: "Full name must be at least 2 characters" }, { status: 400 });
      }
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const staff = await staffService.findUnique({ where: { userId: session.user.id } });
    if (!staff) return NextResponse.json({ error: "HOD profile not found" }, { status: 404 });

    const deptId = staff.departmentId;

    const existing = await userService.findUnique({ email: sanitizedEnrollment });
    if (existing) return NextResponse.json({ error: "User already exists" }, { status: 409 });

    const hashed = await bcrypt.hash(sanitizedEnrollment, 10);

    const created = await userService.create({
      email: sanitizedEnrollment,
      name: sanitizedFullName,
      hashedPassword: hashed,
      role: 'STUDENT',
      departmentId: deptId,
      academicYearId,
    });

    return NextResponse.json({ success: true, id: created.id });
  } catch (error: any) {
    // console.error(error);
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
    const hodProfile = await staffService.findUnique({ where: { userId: hodUserId } });
    if (!hodProfile) return NextResponse.json({ error: "HOD profile not found" }, { status: 404 });

    const students = await userService.findMany({ 
      where: { departmentId: hodProfile.departmentId, role: "STUDENT" }, 
      select: { id: true, name: true, email: true, academicYearId: true } 
    });

    return NextResponse.json(students);
  } catch (error) {
    // console.error(error);
    return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 });
  }
}
