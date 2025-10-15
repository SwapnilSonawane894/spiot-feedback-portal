/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";

// GET: return staff members belonging to the logged-in HOD's department
export async function GET(request: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session || session.user?.role !== "HOD") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hodUserId = session.user.id as string;

    const hodProfile = await prisma.staff.findUnique({ where: { userId: hodUserId } });
    if (!hodProfile) return NextResponse.json({ error: "HOD profile not found" }, { status: 404 });

    const departmentId = hodProfile.departmentId;

    const staff = await (prisma as any).staff.findMany({
      where: { departmentId, user: { role: { equals: "STAFF" } } },
      include: { user: true },
      orderBy: { id: "asc" },
    });

    return NextResponse.json(staff);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch staff" }, { status: 500 });
  }
}

// POST: create a new staff user assigned to the HOD's department
export async function POST(request: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session || session.user?.role !== "HOD") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hodUserId = session.user.id as string;
    const hodProfile = await prisma.staff.findUnique({ where: { userId: hodUserId } });
    if (!hodProfile) return NextResponse.json({ error: "HOD profile not found" }, { status: 404 });

    const body = await request.json();
    const { name, email, password } = body || {};
    if (!name || !email || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return NextResponse.json({ error: "User with this email already exists" }, { status: 409 });

    const hashed = await bcrypt.hash(password, 10);

    // assemble create data and cast to any to avoid transient type issues
    const createData: any = {
      name,
      email,
      hashedPassword: hashed,
      // created staff should be a STAFF role
      role: "STAFF",
      staffProfile: {
        create: {
          department: { connect: { id: hodProfile.departmentId } },
        },
      },
    };

    const createdUser = await prisma.user.create({ data: createData });

    // return the newly-created staff row including the user data
    const createdStaff = await prisma.staff.findUnique({ where: { userId: createdUser.id }, include: { user: true } });

    return NextResponse.json(createdStaff, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create staff" }, { status: 500 });
  }
}
