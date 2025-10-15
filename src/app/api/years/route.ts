/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

// GET: list all academic years (public within authenticated area)
export async function GET() {
  try {
    const years = await (prisma as any).academicYear.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json(years);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch academic years" }, { status: 500 });
  }
}

// POST: create a new academic year (ADMIN only)
export async function POST(request: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, abbreviation } = body || {};
    if (!name || !abbreviation) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const created = await (prisma as any).academicYear.create({ data: { name, abbreviation } });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create academic year" }, { status: 500 });
  }
}
