/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { staffService, userService } from "@/lib/firebase-services";
import bcrypt from "bcrypt";

export async function GET(request: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session || session.user?.role !== "HOD") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hodUserId = session.user.id as string;

    const hodProfile = await staffService.findUnique({ where: { userId: hodUserId } });
    if (!hodProfile) return NextResponse.json({ error: "HOD profile not found" }, { status: 404 });

    const departmentId = hodProfile.departmentId;

    const staff = await staffService.findMany({
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

export async function POST(request: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session || session.user?.role !== "HOD") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hodUserId = session.user.id as string;
    const hodProfile = await staffService.findUnique({ where: { userId: hodUserId } });
    if (!hodProfile) return NextResponse.json({ error: "HOD profile not found" }, { status: 404 });

    const body = await request.json();
    const { name, email, password } = body || {};
    if (!name || !email || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const existing = await userService.findUnique({ email });
    if (existing) return NextResponse.json({ error: "User with this email already exists" }, { status: 409 });

    const hashed = await bcrypt.hash(password, 10);

    const createdUser = await userService.create({
      name,
      email,
      hashedPassword: hashed,
      role: "STAFF",
    });

    const createdStaff = await staffService.create({
      userId: createdUser.id,
      departmentId: hodProfile.departmentId,
    });

    const staffWithUser = await staffService.findUnique({ where: { id: createdStaff.id }, include: { user: true } });

    return NextResponse.json(staffWithUser, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create staff" }, { status: 500 });
  }
}
