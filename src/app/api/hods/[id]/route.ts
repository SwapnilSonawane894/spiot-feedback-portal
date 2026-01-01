import { NextResponse } from "next/server";
import { userService, staffService, departmentService, assignmentService } from "@/lib/mongodb-services";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, email, departmentId } = body || {};

    if (!name || !email || !departmentId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Update user
    const updatedUser = await userService.update({ id }, { name, email });

    // Update staff profile (find by userId)
    await staffService.updateMany({ userId: id }, { departmentId });

    const updated = await userService.findUnique({ id });
    const staffProfile = await staffService.findFirst({ where: { userId: id } });
    const department = staffProfile?.departmentId ? await departmentService.findUnique({ id: staffProfile.departmentId }) : null;
    
    return NextResponse.json({ 
      ...updated, 
      staffProfile: staffProfile ? {
        ...staffProfile,
        department: department ? { id: department.id, name: department.name, abbreviation: department.abbreviation } : null
      } : null
    });
  } catch (error) {
    // console.error(error);
    return NextResponse.json({ error: "Failed to update HOD" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id: userId } = await params;

    // Execute deletion logic sequentially
    const staff = await staffService.findFirst({ where: { userId } });
    const staffId = staff?.id;

    if (staffId) {
      // find department where this staff is hod (check all departments)
      const allDepts = await departmentService.findMany({});
      const dept = allDepts.find(d => d.hodId === staffId);
      if (dept) {
        // unassign hod
        await departmentService.update({ id: dept.id }, { hodId: null });
      }
      // delete any faculty assignments referencing this staff
      await assignmentService.deleteMany({ staffId });
      // delete the staff profile(s) referencing this user
      await staffService.deleteMany({ userId });
    }

    // finally delete the user
    await userService.delete({ id: userId });

    return NextResponse.json({ success: true });
  } catch (error) {
    // console.error(error);
    return NextResponse.json({ error: "Failed to delete HOD" }, { status: 500 });
  }
}
