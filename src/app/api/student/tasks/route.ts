// src/app/api/student/tasks/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import type { Session } from "next-auth";
import { departmentService, getStudentTasksFromDb } from "@/lib/mongodb-services";
import { userService } from "@/lib/mongodb-services";

export async function GET() {
  try {
    const session = (await getServerSession(authOptions as any)) as Session | null;
    if (!session || session.user?.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const student = await userService.findUnique({ id: session.user.id as string });
    if (!student || !student.departmentId) {
      return NextResponse.json([]);
    }
    
    // Check if feedback is active for the department
    const department = await departmentService.findUnique({ id: student.departmentId as string });
    if (!department || !(department as any).isFeedbackActive) {
      return NextResponse.json([]);
    }

  // Call the centralized function and request ungrouped results so the frontend
  // renders one card per faculty assignment (no HTML/CSS changes required).
  // Enable academic-year fallback so students will see same-subject assignments from other years
  // when strict year-matching would otherwise exclude them. This avoids needing manual DB scripts.
  const tasks = await getStudentTasksFromDb(session.user.id as string, { groupBySubject: false, allowAcademicYearFallback: true });

    console.log(`--- [API LOG] Student tasks for ${session.user.email}: Found ${tasks.length} tasks.`);
    
    return NextResponse.json(tasks);
  } catch (error) {
    console.error("API /student/tasks - unexpected error:", error);
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }
}
