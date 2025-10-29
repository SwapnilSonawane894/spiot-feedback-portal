// src/app/api/hod/submission-status/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { staffService, academicYearService, userService, getStudentTasksFromDb } from "@/lib/mongodb-services";

export async function GET(request: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session || session.user?.role !== "HOD") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hodProfile = await staffService.findFirst({ where: { userId: session.user.id } });
    if (!hodProfile || !hodProfile.departmentId) {
      return NextResponse.json({ error: "HOD or department not found" }, { status: 404 });
    }

    const url = new URL(request.url);
    const selectedYearId = url.searchParams.get('yearId');

    const academicYears = await academicYearService.findMany({ where: { departmentId: hodProfile.departmentId } });

    const studentFilter: any = { role: 'STUDENT', departmentId: hodProfile.departmentId };
    if (selectedYearId) {
      studentFilter.academicYearId = selectedYearId;
    }
    const students = await userService.findMany({ where: studentFilter });
    
    const results = await Promise.all(students.map(async (s: any) => {
      // For each student, get their tasks using our new reliable function
  // For HOD submission-status we want ungrouped tasks (one per faculty assignment)
  const tasks = await getStudentTasksFromDb(s.id, { groupBySubject: false });
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(t => t.status === 'Completed').length;
      const year = academicYears.find(y => y.id === s.academicYearId);
      
      return {
        name: s.name,
        email: s.email,
        year: year?.abbreviation || year?.name || '',
        totalTasks,
        completedTasks,
      };
    }));

    return NextResponse.json({
      academicYears,
      selectedYearId: selectedYearId || (academicYears.length > 0 ? academicYears[0].id : null),
      students: results,
    });

  } catch (error) {
    console.error("HOD Submission Status Error:", error);
    return NextResponse.json({ error: 'Failed to fetch submission status' }, { status: 500 });
  }
}

