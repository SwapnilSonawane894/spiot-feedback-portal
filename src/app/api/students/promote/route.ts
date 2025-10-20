/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { staffService, userService } from "@/lib/mongodb-services";

export async function POST(request: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session || session.user?.role !== "HOD") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { fromYearId, toYearId } = body || {};
    if (!fromYearId || !toYearId) return NextResponse.json({ error: "fromYearId and toYearId are required" }, { status: 400 });

    const hodProfile = await staffService.findUnique({ where: { userId: session.user.id } });
    if (!hodProfile) return NextResponse.json({ error: "HOD profile not found" }, { status: 404 });

    const result = await userService.updateMany({ academicYearId: fromYearId, departmentId: hodProfile.departmentId, role: "STUDENT" }, { academicYearId: toYearId });

    return NextResponse.json({ success: true, promoted: result.count });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to promote students" }, { status: 500 });
  }
}
