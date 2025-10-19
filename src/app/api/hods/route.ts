/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { userService, staffService, departmentService } from "@/lib/firebase-services";
import bcrypt from "bcrypt";

export async function GET() {
  try {
    const users = await userService.findMany({ where: { role: 'HOD' } });

    const hods = await Promise.all(users.map(async (u) => {
      const staffProfile = await staffService.findFirst({ where: { userId: u.id } });
      let department = null;
      if (staffProfile && staffProfile.departmentId) {
        department = await departmentService.findUnique({ id: staffProfile.departmentId });
      }

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        staffProfile: staffProfile
          ? { department: department ? { id: department.id, name: department.name, abbreviation: department.abbreviation } : null }
          : null,
      };
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

    const existing = await userService.findUnique({ email });
    if (existing) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 10);

    const created = await userService.create({
      name,
      email,
      hashedPassword: hashed,
      role: "HOD",
    });

    const createdStaff = await staffService.create({
      userId: created.id,
      departmentId,
    });

    const department = await departmentService.findUnique({ id: departmentId });

    const result = {
      ...created,
      staffProfile: {
        ...createdStaff,
        department,
      },
    };

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create HOD" }, { status: 500 });
  }
}
