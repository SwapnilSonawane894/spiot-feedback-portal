/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { academicYearService } from "@/lib/mongodb-services";

export async function PATCH(request: Request, context: any) {
  try {
    const { id } = await context.params;
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, abbreviation, departmentId } = body || {};
    if (!name || !abbreviation) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const updated = await academicYearService.update(
      { id },
      { name, abbreviation, departmentId: departmentId || null }
    );
    return NextResponse.json(updated);
  } catch (error) {
    // console.error(error);
    return NextResponse.json({ error: "Failed to update academic year" }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: any) {
  try {
    const { id } = await context.params;
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await academicYearService.delete({ id });
    return NextResponse.json({ success: true });
  } catch (error) {
    // console.error(error);
    return NextResponse.json({ error: "Failed to delete academic year" }, { status: 500 });
  }
}
