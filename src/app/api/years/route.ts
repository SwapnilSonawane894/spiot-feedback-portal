/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { academicYearService, staffService } from "@/lib/mongodb-services";

export async function GET() {
  try {
    const session = (await getServerSession(authOptions as any)) as any;

    const allYears = await academicYearService.findMany({ orderBy: { name: "asc" } });

    // If requester is an HOD, return only academic years belonging to their department
    // (exclude global years without departmentId so HODs don't see other-department years)
    if (session && session.user?.role === 'HOD') {
      const staff = await staffService.findFirst({ where: { userId: session.user.id } });
      if (!staff || !staff.departmentId) {
        return NextResponse.json({ error: "HOD or department not found" }, { status: 404 });
      }
      const departmentId = staff.departmentId;
      const filtered = allYears.filter((y: any) => y.departmentId && y.departmentId === departmentId);
      return NextResponse.json(filtered);
    }

    return NextResponse.json(allYears);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch academic years" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, abbreviation, departmentId } = body || {};
    if (!name || !abbreviation) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const created = await academicYearService.create({ name, abbreviation, departmentId: departmentId || null });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create academic year" }, { status: 500 });
  }
}
