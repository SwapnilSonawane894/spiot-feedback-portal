import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { staffService, assignmentService, feedbackService } from "@/lib/mongodb-services";

export async function POST(request: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user?.role !== "HOD") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const staff = await staffService.findFirst({ where: { userId: session.user.id } });
    if (!staff) return NextResponse.json({ error: "HOD profile not found" }, { status: 404 });

    // find assignments for department
    const staffList = await staffService.findMany({ where: { departmentId: staff.departmentId } });
    const staffIds = staffList.map((s) => s.id);

  // Fetch assignments scoped to this HOD's department
  const allAssignments = await assignmentService.findMany({ where: { departmentId: staff.departmentId } });
  const assignments = allAssignments.filter(a => staffIds.includes(a.staffId));
    const assignmentIds = assignments.map((a) => a.id);

    if (assignmentIds.length === 0) return NextResponse.json({ success: true, released: 0 });

    // Update all feedback for these assignments
    const allFeedback = await feedbackService.findMany({});
    const feedbackToUpdate = allFeedback.filter(f => assignmentIds.includes(f.assignmentId));
    
    let released = 0;
    for (const fb of feedbackToUpdate) {
      await feedbackService.updateMany({ assignmentId: fb.assignmentId, studentId: fb.studentId }, { isReleased: true });
      released++;
    }

    return NextResponse.json({ success: true, released });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to release feedback" }, { status: 500 });
  }
}
