/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { staffService, assignmentService } from "@/lib/mongodb-services";

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

    // Fetch all assignments for the current semester
    const allAssignments = await assignmentService.findMany({
      where: { semester: CURRENT_SEMESTER },
    });

    return NextResponse.json(allAssignments);
  } catch (error) {
    console.error(error);
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
    const semester = body?.semester ?? CURRENT_SEMESTER;
    const assignments = Array.isArray(body?.assignments) ? body.assignments : [];

    const hodUserId = session.user.id as string;
    const hodProfile = await staffService.findUnique({ where: { userId: hodUserId } });
    if (!hodProfile) return NextResponse.json({ error: "HOD profile not found" }, { status: 404 });

    // Delete all existing assignments for this semester
    console.log("Deleting all existing assignments for semester:", semester);
    const deleteResult = await assignmentService.deleteMany({ semester });
    console.log("Deleted assignments:", deleteResult.count);

    // Create new assignments
    let createResult = null;
    if (assignments.length > 0) {
      const createData = assignments.map((a: any) => ({
        staffId: a.staffId,
        subjectId: a.subjectId,
        semester,
      }));

      console.log("Creating new assignments:", createData.length);
      createResult = await assignmentService.createMany({ data: createData });
      console.log("Created assignments:", createResult?.count ?? 0);
    }

    return NextResponse.json({
      success: true,
      deleted: deleteResult.count,
      created: createResult?.count ?? 0,
    });
  } catch (error: any) {
    console.error("API /hod/faculty-assignments POST error:", error);
    return NextResponse.json({ error: error?.message || "Failed to save assignments" }, { status: 500 });
  }
}
