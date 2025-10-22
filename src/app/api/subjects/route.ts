/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { staffService, subjectService, academicYearService } from "@/lib/mongodb-services";

export async function GET(request: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session || session.user?.role !== "HOD") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

  const hodUserId = session.user.id as string;
  const hodProfile = await staffService.findUnique({ where: { userId: hodUserId } });
  if (!hodProfile) return NextResponse.json({ error: "HOD profile not found. Ensure your user has an associated staff profile." }, { status: 404 });

    const departmentId = hodProfile.departmentId;

  const subjects = await subjectService.findMany({
    orderBy: { name: "asc" },
  });

  // Manually fetch academic year data
  const subjectsWithYear = await Promise.all(
    subjects.map(async (subject) => {
      const academicYear = await academicYearService.findUnique({ id: subject.academicYearId });
      return { ...subject, academicYear };
    })
  );

  return NextResponse.json(subjectsWithYear);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch subjects" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session || (session.user && session.user.role !== "HOD")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hodUserId = session.user.id as string;
    const hodProfile = await staffService.findUnique({ where: { userId: hodUserId } });
    if (!hodProfile) return NextResponse.json({ error: "HOD profile not found" }, { status: 404 });
  const departmentId = hodProfile.departmentId;

    const body = await request.json();
    let { name, subjectCode, academicYearId } = body || {};
    name = typeof name === 'string' ? name.trim() : name;
    subjectCode = typeof subjectCode === 'string' ? subjectCode.trim().toUpperCase() : subjectCode;

    if (!name || !subjectCode || !academicYearId) {
      return NextResponse.json({ error: "Missing required fields: name, subjectCode, academicYearId are required" }, { status: 400 });
    }

    const year = await academicYearService.findUnique({ id: academicYearId });
    if (!year) return NextResponse.json({ error: `AcademicYear not found for id=${academicYearId}` }, { status: 400 });

    const existing = await subjectService.findMany({ where: { subjectCode } });
    if (existing && existing.length > 0) {
      return NextResponse.json({ error: `Subject with code '${subjectCode}' already exists.` }, { status: 409 });
    }

    try {
      const created = await subjectService.create({
        name,
        subjectCode,
        academicYearId,
        departmentId,
      });
      return NextResponse.json(created, { status: 201 });
    } catch (err: any) {
      console.error("Failed to create subject:", err);
      return NextResponse.json({ error: err?.message || "Failed to create subject" }, { status: 500 });
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create subject" }, { status: 500 });
  }
}
