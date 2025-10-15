/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

const CURRENT_SEMESTER = "Odd 2025-26";

// GET: return staff in HOD's department with assigned subjectIds for the current semester
export async function GET() {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session || session.user?.role !== "HOD") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hodUserId = session.user.id as string;
    const hodProfile = await prisma.staff.findUnique({ where: { userId: hodUserId } });
    if (!hodProfile) return NextResponse.json({ error: "HOD profile not found" }, { status: 404 });

    const departmentId = hodProfile.departmentId;

    const staff = await prisma.staff.findMany({
      where: { departmentId },
      include: { user: true, assignments: { where: { semester: CURRENT_SEMESTER } } },
      orderBy: { id: "asc" },
    });

    const result = staff.map((s) => ({
      id: s.id,
      user: s.user,
      subjectIds: s.assignments.map((a) => a.subjectId),
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch assignments" }, { status: 500 });
  }
}

// POST: accept an array of assignments and sync them (delete existing for semester then createMany)
export async function POST(request: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session || session.user?.role !== "HOD") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    // Expect payload: { staffId: string, subjectIds: string[], semester?: string }
    console.log("API /assignments POST received body:", body);

    const staffId = body?.staffId as string | undefined;
    const subjectIds = Array.isArray(body?.subjectIds) ? body.subjectIds : [];
    const semester = body?.semester ?? CURRENT_SEMESTER;

    if (!staffId) {
      return NextResponse.json({ error: "Invalid payload: staffId required" }, { status: 400 });
    }

    console.log("API /assignments POST for staffId", staffId, { subjectIds, semester });

    const hodUserId = session.user.id as string;
    const hodProfile = await prisma.staff.findUnique({ where: { userId: hodUserId } });
    if (!hodProfile) return NextResponse.json({ error: "HOD profile not found" }, { status: 404 });

    // Optional: could validate staff belongs to same department. We'll attempt to fetch the staff record.
    const staffRecord = await prisma.staff.findUnique({ where: { id: staffId } });
    if (!staffRecord) return NextResponse.json({ error: "Staff not found" }, { status: 404 });

    // Ensure staff is in the same department as HOD
    if (staffRecord.departmentId !== hodProfile.departmentId) {
      return NextResponse.json({ error: "Staff does not belong to your department" }, { status: 403 });
    }

    // Build create data for createMany
    const createData = subjectIds.map((subjId: string) => ({ staffId, subjectId: subjId, semester }));

    console.log("API /assignments POST - deleting existing assignments for staffId", staffId, "semester", semester);
    const deleteResult = await prisma.facultyAssignment.deleteMany({ where: { staffId, semester } });
    console.log("API /assignments POST - deleteMany result:", deleteResult);

    let createResult = null;
    if (createData.length) {
      console.log("API /assignments POST - creating assignments", createData.length, "rows");
      createResult = await prisma.facultyAssignment.createMany({ data: createData });
      console.log("API /assignments POST - createMany result:", createResult);
    } else {
      console.log("API /assignments POST - no subjects provided; skipped createMany");
    }

    return NextResponse.json({ success: true, deleted: deleteResult.count, created: createResult?.count ?? 0 });
  } catch (error: any) {
    console.error("API /assignments POST error:", error);
    return NextResponse.json({ error: error?.message || "Failed to save assignments" }, { status: 500 });
  }
}
