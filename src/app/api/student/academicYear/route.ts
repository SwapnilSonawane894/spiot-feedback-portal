// src/app/api/student/academicYear/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import type { Session } from "next-auth";
import { userService } from "@/lib/mongodb-services";

export async function GET() {
  try {
    const session = (await getServerSession(authOptions as any)) as Session | null;
    if (!session || session.user?.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const student = await userService.findUnique({ id: session.user.id as string });
    if (!student || !student.academicYearId) {
      return NextResponse.json({ error: "Academic year not found" }, { status: 404 });
    }

    // Add the academic year id to help identify which year a student is in
    const response = {
      academicYearId: student.academicYearId.toString(),
      academicYearStr: student.academicYear?.name || "Unknown Academic Year"
    };

    return NextResponse.json(response);
  } catch (error) {
    // console.error("API /student/academicYear - unexpected error:", error);
    return NextResponse.json({ error: "Failed to fetch academic year" }, { status: 500 });
  }
}