/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { staffService, assignmentService, userService } from "@/lib/mongodb-services";

const CURRENT_SEMESTER = "Odd 2025-26";

export async function GET() {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session || session.user?.role !== "HOD") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hodUserId = session.user.id as string;
    const hodProfile = await staffService.findUnique({ where: { userId: hodUserId } });
    if (!hodProfile) return NextResponse.json({ error: "HOD profile not found" }, { status: 404 });

    // Fetch all staff from all departments to allow cross-departmental assignments
    const staff = await staffService.findMany({});

    // Manually fetch user and assignments for each staff member
    const result = await Promise.all(
      staff.map(async (s: any) => {
        const user = await userService.findUnique({ id: s.userId });
        // Only fetch assignments that belong to the HOD's department
        const assignments = await assignmentService.findMany({
          where: { staffId: s.id, semester: CURRENT_SEMESTER, departmentId: hodProfile.departmentId },
        });
        
        return {
          id: s.id,
          user: user,
          subjectIds: assignments.map((a: any) => a.subjectId),
        };
      })
    );

    return NextResponse.json(result);
  } catch (error) {
    // console.error(error);
    return NextResponse.json({ error: "Failed to fetch assignments" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session || session.user?.role !== "HOD") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
  // request body received

    const staffId = body?.staffId as string | undefined;
    const subjectIds = Array.isArray(body?.subjectIds) ? body.subjectIds : [];
    const semester = body?.semester ?? CURRENT_SEMESTER;

    if (!staffId) {
      return NextResponse.json({ error: "Invalid payload: staffId required" }, { status: 400 });
    }

  // processing assignment save for staff

    const hodUserId = session.user.id as string;
    const hodProfile = await staffService.findUnique({ where: { userId: hodUserId } });
    if (!hodProfile) return NextResponse.json({ error: "HOD profile not found" }, { status: 404 });

    const staffRecord = await staffService.findUnique({ where: { id: staffId } });
    if (!staffRecord) return NextResponse.json({ error: "Staff not found" }, { status: 404 });

    // Allow cross-departmental faculty assignments (removed department restriction)

    // Attach departmentId from HOD profile so assignments are scoped to the HOD's department
    const createData = subjectIds.map((subjId: string) => ({
      staffId,
      subjectId: subjId,
      semester,
      departmentId: hodProfile.departmentId,
    }));

    const deleteResult = await assignmentService.deleteMany({ staffId, semester });
  // deleted existing assignments for staffId/semester

    let createResult = null;
    if (createData.length) {
      createResult = await assignmentService.createMany({ data: createData });
    }

    return NextResponse.json({ success: true, deleted: deleteResult.count, created: createResult?.count ?? 0 });
  } catch (error: any) {
    // console.error("API /assignments POST error:", error);
    return NextResponse.json({ error: error?.message || "Failed to save assignments" }, { status: 500 });
  }
}
