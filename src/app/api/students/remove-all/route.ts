/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { staffService, userService, academicYearService } from "@/lib/mongodb-services";

export async function POST(request: NextRequest) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session || session.user?.role !== "HOD") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { yearId, confirmRemoval } = body || {};
    
    if (!yearId) {
      return NextResponse.json({ error: "yearId is required" }, { status: 400 });
    }

    const hodProfile = await staffService.findUnique({ where: { userId: session.user.id } });
    if (!hodProfile) {
      return NextResponse.json({ error: "HOD profile not found" }, { status: 404 });
    }

    const departmentId = hodProfile.departmentId;

    // Get year details
    const year = await academicYearService.findUnique({ id: yearId });
    if (!year) {
      return NextResponse.json({ error: "Invalid academic year" }, { status: 400 });
    }

    // Count students to be removed
    const studentCount = await userService.count({
      academicYearId: yearId,
      departmentId,
      role: "STUDENT"
    });

    // If not confirmed, return count for confirmation
    if (!confirmRemoval) {
      return NextResponse.json({
        yearId,
        yearName: year.abbreviation || year.name,
        studentCount,
        requiresConfirmation: true,
        message: `This will permanently remove ${studentCount} students from "${year.abbreviation || year.name}". Are you sure?`
      });
    }

    // Delete all students from the specified year and department
    const result = await userService.deleteMany({
      academicYearId: yearId,
      departmentId,
      role: "STUDENT"
    });

    return NextResponse.json({
      success: true,
      removed: result.count,
      yearName: year.abbreviation || year.name
    });
  } catch (error) {
    // console.error(error);
    return NextResponse.json({ error: "Failed to remove students" }, { status: 500 });
  }
}
