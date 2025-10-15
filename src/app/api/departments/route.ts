import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const departments = await prisma.department.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json(departments);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch departments" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, abbreviation } = body || {};

    if (!name || !abbreviation) {
      return NextResponse.json({ error: "Missing name or abbreviation" }, { status: 400 });
    }

    const created = await prisma.department.create({ data: { name, abbreviation } });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create department" }, { status: 500 });
  }
}
