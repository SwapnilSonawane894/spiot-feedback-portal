/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import type { Session } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { staffService, userService, hodSuggestionService, assignmentService } from "@/lib/mongodb-services";
import { validateDepartmentExists, validateEmailUnique } from "@/lib/data-validation";
import { getDatabase } from '@/lib/mongodb';

export async function PATCH(request: Request, context: any) {
  try {
    const { id } = await context.params;

    const session = (await getServerSession(authOptions as any)) as Session | null;
    const role = session?.user?.role as string | undefined;
    if (!session || !role || !["ADMIN", "HOD"].includes(role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const staffProfile = await staffService.findUnique({ 
      where: { id },
      include: { user: true, department: true }
    });
    if (!staffProfile) return NextResponse.json({ error: "Staff not found" }, { status: 404 });

    if (session.user.role === "HOD") {
      const hodUserId = session.user.id as string;
      const hodProfile = await staffService.findUnique({ where: { userId: hodUserId } });
      if (!hodProfile) return NextResponse.json({ error: "HOD profile not found" }, { status: 404 });

      if (staffProfile.departmentId !== hodProfile.departmentId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const body = await request.json();
    const { name, email, departmentId } = body;

    // Validate data before making any changes
    if (departmentId) {
      const departmentExists = await validateDepartmentExists(departmentId);
      if (!departmentExists) {
        return NextResponse.json({ error: "Department not found" }, { status: 404 });
      }
    }

    // Start transaction
    const db = await getDatabase();
    const session_db = db.client.startSession();

    try {
      await session_db.withTransaction(async () => {
        // Update user data if provided
        if (name || email) {
          const updateData: any = {};
          if (name) updateData.name = name;
          if (email) {
            // Only ADMIN may update a user's email via this endpoint
            if (session.user.role !== "ADMIN") {
              throw new Error("Forbidden: only admin can change email");
            }
            // Verify email uniqueness excluding current user
            const isEmailUnique = await validateEmailUnique(email, staffProfile.userId);
            if (!isEmailUnique) {
              throw new Error("Email already exists");
            }
            updateData.email = email;
          }
          await userService.update({ id: staffProfile.userId }, updateData);
        }

        // Update staff profile if department change requested
        if (departmentId !== undefined) {
          await staffService.update({ id }, { 
            departmentId,
            updatedAt: new Date()
          });

          // Get all assignments for this staff
          const assignments = await db.collection('facultyAssignments')
            .find({ staffId: id }).toArray();

          // Update department ID in all assignments
          if (assignments.length > 0) {
            await db.collection('facultyAssignments').updateMany(
              { staffId: id },
              { $set: { departmentId: departmentId } }
            );
          }
        }
      });

      // Fetch and return updated data
      const updatedStaff = await staffService.findUnique({ 
        where: { id },
        include: { user: true, department: true }
      });

      return NextResponse.json(updatedStaff);
    } catch (error: any) {
      // console.error('Transaction error:', error);
      return NextResponse.json({ 
        error: error.message || "Failed to update staff" 
      }, { status: 400 });
    } finally {
      await session_db.endSession();
    }
  } catch (error) {
    // console.error(error);
    return NextResponse.json({ error: "Failed to update staff" }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: any) {
  try {
    const { id } = await context.params;
    const session = (await getServerSession(authOptions as any)) as Session | null;
    const role = session?.user?.role as string | undefined;
    if (!session || !role || !["ADMIN", "HOD"].includes(role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const staff = await staffService.findUnique({ where: { id } });
    if (!staff) return NextResponse.json({ error: "Staff not found" }, { status: 404 });

    if (session.user.role === "HOD") {
      const hodUserId = session.user.id as string;
      const hodProfile = await staffService.findUnique({ where: { userId: hodUserId } });
      if (!hodProfile) return NextResponse.json({ error: "HOD profile not found" }, { status: 404 });

      if (staff.departmentId !== hodProfile.departmentId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const db = await getDatabase();
    const session_db = db.client.startSession();

    try {
      await session_db.withTransaction(async () => {
        // Delete all related records in order
        await hodSuggestionService.deleteMany({ staffId: staff.id });
        await assignmentService.deleteMany({ staffId: staff.id });
        
        // Delete staff profile
        await staffService.deleteMany({ id: staff.id });
        
        // Finally delete the user
        await userService.delete({ id: staff.userId });
      });

      return NextResponse.json({ success: true });
    } catch (error: any) {
      // console.error('Transaction error:', error);
      return NextResponse.json({ 
        error: error.message || "Failed to delete staff" 
      }, { status: 400 });
    } finally {
      await session_db.endSession();
    }
  } catch (error) {
    // console.error(error);
    return NextResponse.json({ error: "Failed to delete staff" }, { status: 500 });
  }
}
