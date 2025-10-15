/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";

export async function GET() {
  try {
    // Return all users with HOD role. Some HOD accounts may not yet be assigned via department.hodId —
    // include their staffProfile and department info when available.
    const users = await prisma.user.findMany({
      where: { role: 'HOD' },
      include: { staffProfile: { include: { department: true } } },
      orderBy: { name: 'asc' },
    });

    const hods = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      staffProfile: u.staffProfile
        ? { department: u.staffProfile.department ? { id: u.staffProfile.department.id, name: u.staffProfile.department.name, abbreviation: u.staffProfile.department.abbreviation } : null }
        : null,
    }));

    return NextResponse.json(hods);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch HODs" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password, departmentId } = body || {};

    if (!name || !email || !password || !departmentId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // check for existing user
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 10);

    // build data object and cast to `any` to avoid transient TypeScript errors
    const createData: any = {
      name,
      email,
      hashedPassword: hashed,
      role: "HOD",
      staffProfile: {
        create: {
          department: { connect: { id: departmentId } },
        },
      },
    };

    const created = await prisma.user.create({
      data: createData,
      include: {
        staffProfile: { include: { department: true } },
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create HOD" }, { status: 500 });
  }
}
