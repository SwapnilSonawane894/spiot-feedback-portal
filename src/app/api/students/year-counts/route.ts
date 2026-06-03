/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { staffService, userService, academicYearService } from "@/lib/mongodb-services";

export async function GET() {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session || session.user?.role !== "HOD") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hodProfile = await staffService.findUnique({ where: { userId: session.user.id } });
    if (!hodProfile) {
      return NextResponse.json({ error: "HOD profile not found" }, { status: 404 });
    }

    const departmentId = hodProfile.departmentId;

    // Get all years for this department
    const years = await academicYearService.findMany({
      where: { departmentId },
      orderBy: { name: "asc" }
    });

    // Get student counts for each year
    const yearCounts = await Promise.all(
      years.map(async (year: any) => {
        const count = await userService.count({
          academicYearId: year.id,
          departmentId,
          role: "STUDENT"
        });
        return {
          id: year.id,
          name: year.name,
          abbreviation: year.abbreviation,
          studentCount: count,
          // Determine if this is the final year (TY) based on abbreviation pattern
          // Common patterns: TYCE, TYCO, TYEE, TYME, TY-something, or just "TY"
          isFinalYear: /^TY/i.test(year.abbreviation || year.name)
        };
      })
    );

    return NextResponse.json(yearCounts);
  } catch (error) {
    // console.error(error);
    return NextResponse.json({ error: "Failed to fetch year counts" }, { status: 500 });
  }
}
