import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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

    const totalStaff = await prisma.staff.count({
      where: { departmentId },
    });

    const totalSubjects = await prisma.subject.count({
      where: {
        academicYear: {
          students: {
            some: {
              departmentId,
            },
          },
        },
      },
    });

    const totalStudents = await prisma.user.count({
      where: {
        departmentId,
        role: "STUDENT",
      },
    });

    const totalAssignments = await prisma.facultyAssignment.count({
      where: {
        semester,
        staff: {
          departmentId,
        },
      },
    });

    const totalFeedbackSubmissions = await prisma.feedback.count({
      where: {
        assignment: {
          semester,
          staff: {
            departmentId,
          },
        },
      },
    });

    return NextResponse.json({
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
