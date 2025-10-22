/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { staffService, assignmentService, semesterSettingsService } from "@/lib/mongodb-services";

export async function GET() {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session || session.user?.role !== "HOD") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hodUserId = session.user.id as string;
    const hodProfile = await staffService.findUnique({ where: { userId: hodUserId } });
    if (!hodProfile) return NextResponse.json({ error: "HOD profile not found" }, { status: 404 });

    // Get current semester from settings
    const semesterSettings = await semesterSettingsService.get();
    const semesterString = semesterSettingsService.getCurrentSemesterString(
      semesterSettings.currentSemester,
      semesterSettings.academicYear
    );

    // Fetch all assignments for the current semester
    const allAssignments = await assignmentService.findMany({
      where: { semester: semesterString },
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
    
    // Get current semester from settings if not provided
    let semester = body?.semester;
    if (!semester) {
      const semesterSettings = await semesterSettingsService.get();
      semester = semesterSettingsService.getCurrentSemesterString(
        semesterSettings.currentSemester,
        semesterSettings.academicYear
      );
    }
    
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
  // assignmentService.createMany expects an array of docs, so pass the array directly
  createResult = await assignmentService.createMany(createData);
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
