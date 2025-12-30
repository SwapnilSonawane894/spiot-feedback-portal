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

    console.log('🔓 [HOD Release] Starting release process');
    console.log('🔓 [HOD Release] HOD Staff ID:', staff.id);
    console.log('🔓 [HOD Release] HOD Department ID:', staff.departmentId);

    // Fetch ALL assignments for this HOD's department (regardless of which department the staff belongs to)
    // This ensures external faculty teaching in this department also get their feedback released
    const assignments = await assignmentService.findMany({ where: { departmentId: staff.departmentId } });
    const assignmentIds = assignments.map((a) => a.id);

    console.log('🔓 [HOD Release] Assignments found in department:', assignments.length);
    if (assignments.length > 0) {
      // Log unique staff IDs in these assignments
      const uniqueStaffIds = [...new Set(assignments.map(a => a.staffId))];
      console.log('🔓 [HOD Release] Unique staff IDs in assignments:', uniqueStaffIds);
    }

    if (assignmentIds.length === 0) return NextResponse.json({ success: true, released: 0 });

    // Update all feedback for these assignments
    const allFeedback = await feedbackService.findMany({});
    const feedbackToUpdate = allFeedback.filter(f => assignmentIds.includes(f.assignmentId));
    
    console.log('🔓 [HOD Release] Total feedbacks to release:', feedbackToUpdate.length);
    
    let released = 0;
    for (const fb of feedbackToUpdate) {
      await feedbackService.updateMany({ assignmentId: fb.assignmentId, studentId: fb.studentId }, { isReleased: true });
      released++;
    }

    console.log('🔓 [HOD Release] Successfully released:', released, 'feedbacks');

    return NextResponse.json({ success: true, released });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to release feedback" }, { status: 500 });
  }
}
