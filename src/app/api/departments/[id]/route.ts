import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, abbreviation } = body || {};

    if (!name || !abbreviation) {
      return NextResponse.json({ error: "Missing name or abbreviation" }, { status: 400 });
    }

    const updated = await prisma.department.update({ where: { id }, data: { name, abbreviation } });
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update department" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, abbreviation } = body || {};

    if (!name || !abbreviation) {
      return NextResponse.json({ error: "Missing name or abbreviation" }, { status: 400 });
    }

    const updated = await prisma.department.update({ where: { id }, data: { name, abbreviation } });
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update department" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    await prisma.department.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete department" }, { status: 500 });
  }
}
