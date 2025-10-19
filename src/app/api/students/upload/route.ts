/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { departmentService, userService } from "@/lib/firebase-services";
import bcrypt from "bcrypt";
import Papa from "papaparse";

// POST: upload CSV and create student users
export async function POST(request: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session || (session.user?.role !== "HOD" && session.user?.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const academicYearId = formData.get("academicYearId") as string | null;

    if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    if (!academicYearId) return NextResponse.json({ error: "academicYearId is required" }, { status: 400 });

    const text = await file.text();

    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true }) as any;
    const rows = parsed.data as Array<Record<string, string>>;

    const created: string[] = [];
    const skipped: { email: string; reason: string }[] = [];

    for (const r of rows) {
      const enrollment = (r.enrollmentNumber || r.enrollment || r.email || "").toString().trim();
      const fullName = (r.fullName || r.name || "").toString().trim();
      const deptAbbr = (r.department || r.dept || "").toString().trim();

      if (!enrollment || !fullName || !deptAbbr) {
        skipped.push({ email: enrollment || "", reason: "Missing required columns" });
        continue;
      }

  // find department
  const dept = await departmentService.findUnique({ abbreviation: deptAbbr });
      if (!dept) {
        skipped.push({ email: enrollment, reason: `Department not found: ${deptAbbr}` });
        continue;
      }

      // check existing user
  const existing = await userService.findUnique({ email: enrollment });
      if (existing) {
        skipped.push({ email: enrollment, reason: "User already exists" });
        continue;
      }

      const hashed = await bcrypt.hash(enrollment, 10);

      try {
        await userService.create({
          email: enrollment,
          name: fullName,
          hashedPassword: hashed,
          role: "STUDENT",
          departmentId: dept.id,
          academicYearId,
        });
        created.push(enrollment);
      } catch (err: any) {
        console.error("Failed to create user for", enrollment, err);
        skipped.push({ email: enrollment, reason: err?.message || "create failed" });
      }
    }

    return NextResponse.json({ success: true, createdCount: created.length, created, skipped });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error?.message || "Failed to upload students" }, { status: 500 });
  }
}
