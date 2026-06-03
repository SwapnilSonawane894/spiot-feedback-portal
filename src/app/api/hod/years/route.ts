/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { staffService, academicYearService } from "@/lib/mongodb-services";

export async function GET() {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user?.role !== "HOD") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const staff = await staffService.findFirst({ where: { userId: session.user.id } });
    if (!staff || !staff.departmentId) {
      return NextResponse.json({ error: "HOD or department not found" }, { status: 404 });
    }

    const departmentId = staff.departmentId;

    const allYears = await academicYearService.findMany({ orderBy: { name: "asc" } });
    
    const filteredYears = allYears.filter((year: any) => {
      return !year.departmentId || year.departmentId === departmentId;
    });

    return NextResponse.json(filteredYears);
  } catch (error) {
    // console.error(error);
    return NextResponse.json({ error: "Failed to fetch academic years" }, { status: 500 });
  }
}
