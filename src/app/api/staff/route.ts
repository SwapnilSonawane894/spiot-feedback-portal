/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { staffService, userService, departmentService } from "@/lib/firebase-services";
import bcrypt from "bcrypt";

export async function GET(request: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session || !["ADMIN", "HOD"].includes(session.user?.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const staff = await staffService.findMany({});

    const staffWithUsers = await Promise.all(
      staff.map(async (s: any) => {
        const user = await userService.findUnique({ id: s.userId });
        const department = s.departmentId ? await departmentService.findUnique({ id: s.departmentId }) : null;
        return { 
          id: s.id,
          user: user ? { id: user.id, name: user.name, email: user.email } : null,
          department: department ? { id: department.id, name: department.name, abbreviation: department.abbreviation } : null,
        };
      })
    );

    const filteredStaff = staffWithUsers.filter((s) => s.user);

    return NextResponse.json(filteredStaff);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch staff" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, email, password, departmentId } = body;

    if (!name || !email || !password || !departmentId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const existingUser = await userService.findUnique({ email });
    if (existingUser) {
      return NextResponse.json({ error: "Email already exists" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await userService.create({
      name,
      email,
      hashedPassword,
      role: "STAFF",
    });

    const staff = await staffService.create({
      userId: user.id,
      departmentId,
    });

    return NextResponse.json({ success: true, staffId: staff.id });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create staff" }, { status: 500 });
  }
}
