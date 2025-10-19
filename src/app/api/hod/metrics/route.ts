import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "HOD") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = (session.user as any).id;
    const staffProfile = await prisma.staff.findUnique({
      where: { userId },
      include: { department: true },
    });

    if (!staffProfile) {
      return NextResponse.json({ error: "Staff profile not found" }, { status: 404 });
    }

    const departmentId = staffProfile.departmentId;
    const semester = "Odd 2025-26";

    // OPTIMIZED: Run all counts in parallel
    const [totalStaff, totalSubjects, totalStudents, totalAssignments, totalFeedbackSubmissions] = await Promise.all([
      prisma.staff.count({
        where: { departmentId },
      }),
      prisma.subject.count({
        where: {
          academicYear: {
            students: {
              some: {
                departmentId,
              },
            },
          },
        },
      }),
      prisma.user.count({
        where: {
          departmentId,
          role: "STUDENT",
        },
      }),
      prisma.facultyAssignment.count({
        where: {
          semester,
          staff: {
            departmentId,
          },
        },
      }),
      prisma.feedback.count({
        where: {
          assignment: {
            semester,
            staff: {
              departmentId,
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      staffCount: totalStaff,
      subjectCount: totalSubjects,
      studentCount: totalStudents,
      totalStaff,
      totalSubjects,
      totalStudents,
      totalAssignments,
      totalFeedbackSubmissions,
    });
  } catch (error) {
    console.error("Error fetching HOD metrics:", error);
    return NextResponse.json({ error: "Failed to fetch metrics" }, { status: 500 });
  }
}
