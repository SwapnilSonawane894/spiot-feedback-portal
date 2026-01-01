/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { staffService, userService, departmentService } from "@/lib/mongodb-services";
import { validateDepartmentExists, validateEmailUnique } from "@/lib/data-validation";
import { getDatabase } from '@/lib/mongodb';
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
    // console.error(error);
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

    // Pre-validate all data before starting transaction
    const [departmentExists, isEmailUnique] = await Promise.all([
      validateDepartmentExists(departmentId),
      validateEmailUnique(email)
    ]);

    if (!departmentExists) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 });
    }

    if (!isEmailUnique) {
      return NextResponse.json({ error: "Email already exists" }, { status: 400 });
    }

    // Start transaction
    const db = await getDatabase();
    const session_db = db.client.startSession();

    try {
      const result = await session_db.withTransaction(async () => {
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create user
        const user = await userService.create({
          name,
          email,
          hashedPassword,
          role: "STAFF",
          createdAt: new Date(),
          updatedAt: new Date()
        });

        // Generate unique employee ID
        const timestamp = new Date().getTime();
        const employeeId = `STAFF${timestamp.toString().slice(-6)}`;

        // Create staff profile
        const staff = await staffService.create({
          userId: user.id,
          departmentId,
          employeeId,
          createdAt: new Date(),
          updatedAt: new Date()
        });

        return { userId: user.id, staffId: staff.id };
      });

      // Fetch complete staff data with relationships
      const createdStaff = await staffService.findUnique({
        where: { id: result.staffId },
        include: {
          user: true,
          department: true
        }
      });

      return NextResponse.json({ 
        success: true,
        staff: createdStaff
      });
    } catch (error: any) {
      // console.error('Transaction error:', error);
      return NextResponse.json({ 
        error: error.message || "Failed to create staff" 
      }, { status: 400 });
    } finally {
      await session_db.endSession();
    }
  } catch (error) {
    // console.error(error);
    return NextResponse.json({ error: "Failed to create staff" }, { status: 500 });
  }
}
