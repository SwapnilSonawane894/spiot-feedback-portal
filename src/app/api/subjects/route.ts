/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

// GET: list subjects for the logged-in HOD's department
export async function GET(request: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session || session.user?.role !== "HOD") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

  const hodUserId = session.user.id as string;
  const hodProfile = await prisma.staff.findUnique({ where: { userId: hodUserId } });
  if (!hodProfile) return NextResponse.json({ error: "HOD profile not found. Ensure your user has an associated staff profile." }, { status: 404 });

    const departmentId = hodProfile.departmentId;

  // Return all subjects (include their academic year). Previously this only returned
  // subjects that already had assignments in the HOD's department which meant HODs
  // couldn't assign subjects when none existed yet. Returning all subjects lets the
  // HOD pick from the full list and assign staff.
  const subjects = await (prisma as any).subject.findMany({
    orderBy: { name: "asc" },
    include: { academicYear: true },
  });
  return NextResponse.json(subjects);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch subjects" }, { status: 500 });
  }
}

// POST: create a new subject for the logged-in HOD's department
export async function POST(request: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session || (session.user && session.user.role !== "HOD")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hodUserId = session.user.id as string;
    const hodProfile = await prisma.staff.findUnique({ where: { userId: hodUserId } });
    if (!hodProfile) return NextResponse.json({ error: "HOD profile not found" }, { status: 404 });

    const body = await request.json();
    let { name, subjectCode, academicYearId } = body || {};
    name = typeof name === 'string' ? name.trim() : name;
    subjectCode = typeof subjectCode === 'string' ? subjectCode.trim().toUpperCase() : subjectCode;

    if (!name || !subjectCode || !academicYearId) {
      return NextResponse.json({ error: "Missing required fields: name, subjectCode, academicYearId are required" }, { status: 400 });
    }

    // Verify academic year exists
    const year = await (prisma as any).academicYear.findUnique({ where: { id: academicYearId } });
    if (!year) return NextResponse.json({ error: `AcademicYear not found for id=${academicYearId}` }, { status: 400 });

    // Pre-check duplicate subjectCode to return a friendlier 409 rather than a DB error
    const existing = await (prisma as any).subject.findUnique({ where: { subjectCode } });
    if (existing) {
      return NextResponse.json({ error: `Subject with code '${subjectCode}' already exists.` }, { status: 409 });
    }

    try {
      // create using academicYearId directly to avoid relation typing issues
      const created = await (prisma as any).subject.create({
        data: {
          name,
          subjectCode,
          academicYearId,
        },
      });
      return NextResponse.json(created, { status: 201 });
    } catch (err: any) {
      console.error("Failed to create subject:", err);
      // Return the error message to help debugging; in production you may want to hide details
      return NextResponse.json({ error: err?.message || "Failed to create subject" }, { status: 500 });
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create subject" }, { status: 500 });
  }
}
