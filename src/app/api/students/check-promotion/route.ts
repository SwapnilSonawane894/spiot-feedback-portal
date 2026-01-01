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
    const { fromYearId, toYearId } = body || {};
    
    if (!fromYearId || !toYearId) {
      return NextResponse.json({ error: "fromYearId and toYearId are required" }, { status: 400 });
    }

    const hodProfile = await staffService.findUnique({ where: { userId: session.user.id } });
    if (!hodProfile) {
      return NextResponse.json({ error: "HOD profile not found" }, { status: 404 });
    }

    const departmentId = hodProfile.departmentId;

    // Get year details
    const fromYear = await academicYearService.findUnique({ id: fromYearId });
    const toYear = await academicYearService.findUnique({ id: toYearId });

    if (!fromYear || !toYear) {
      return NextResponse.json({ error: "Invalid academic year" }, { status: 400 });
    }

    // Count students in source year (for this department)
    const sourceCount = await userService.count({
      academicYearId: fromYearId,
      departmentId,
      role: "STUDENT"
    });

    // Count students in target year (for this department)
    const targetCount = await userService.count({
      academicYearId: toYearId,
      departmentId,
      role: "STUDENT"
    });

    return NextResponse.json({
      sourceYear: {
        id: fromYearId,
        name: fromYear.name,
        abbreviation: fromYear.abbreviation,
        studentCount: sourceCount
      },
      targetYear: {
        id: toYearId,
        name: toYear.name,
        abbreviation: toYear.abbreviation,
        studentCount: targetCount
      },
      canPromote: targetCount === 0,
      warning: targetCount > 0 
        ? `Target year "${toYear.abbreviation || toYear.name}" already has ${targetCount} students. Please promote or remove them first.`
        : null
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to check promotion eligibility" }, { status: 500 });
  }
}
