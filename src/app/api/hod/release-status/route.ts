/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { staffService, feedbackService, assignmentService } from "@/lib/mongodb-services";

export async function GET() {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user?.role !== "HOD") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const staff = await staffService.findFirst({ where: { userId: session.user.id } });
    if (!staff) return NextResponse.json({ error: "Staff profile not found" }, { status: 404 });

    // Check the first feedback in the department to infer release status
    // Get all staff in department, then their assignments, then feedback
    const deptStaff = await staffService.findMany({ where: { departmentId: staff.departmentId } });
    const staffIds = deptStaff.map(s => s.id);
    const deptAssignments = await assignmentService.findMany({});
    const relevantAssignments = deptAssignments.filter(a => staffIds.includes(a.staffId));
    const assignmentIds = relevantAssignments.map(a => a.id);
    
    const allFeedback = await feedbackService.findMany({});
    const deptFeedback = allFeedback.filter(f => assignmentIds.includes(f.assignmentId));
    const firstFeedback = deptFeedback.length > 0 ? deptFeedback[0] : null;

    const isReleased = firstFeedback ? firstFeedback.isReleased : false;
    return NextResponse.json({ isReleased });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch release status" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user?.role !== "HOD") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json();
    const { shouldBeReleased } = body || {};
    if (typeof shouldBeReleased !== 'boolean') return NextResponse.json({ error: 'shouldBeReleased must be boolean' }, { status: 400 });

    const staff = await staffService.findFirst({ where: { userId: session.user.id } });
    if (!staff) return NextResponse.json({ error: "Staff profile not found" }, { status: 404 });

    // Get all staff in department, then their assignments, then bulk update feedback
    const deptStaff = await staffService.findMany({ where: { departmentId: staff.departmentId } });
    const staffIds = deptStaff.map(s => s.id);
    const deptAssignments = await assignmentService.findMany({});
    const relevantAssignments = deptAssignments.filter(a => staffIds.includes(a.staffId));
    const assignmentIds = relevantAssignments.map(a => a.id);
    
    // Update all feedback for these assignments
    const allFeedback = await feedbackService.findMany({});
    const feedbackToUpdate = allFeedback.filter(f => assignmentIds.includes(f.assignmentId));
    
    // Update each feedback individually
    let updated = 0;
    for (const fb of feedbackToUpdate) {
      await feedbackService.updateMany({ assignmentId: fb.assignmentId, studentId: fb.studentId }, { isReleased: shouldBeReleased });
      updated++;
    }

    return NextResponse.json({ success: true, updated, isReleased: shouldBeReleased });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update release status" }, { status: 500 });
  }
}
