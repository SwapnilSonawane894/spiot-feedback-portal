/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { userService } from "@/lib/firebase-services";
import bcrypt from "bcrypt";

export async function GET() {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await userService.findUnique({ id: session.user.id });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    return NextResponse.json({ id: user.id, name: user.name, email: user.email, role: user.role });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (session.user?.role === "STUDENT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, currentPassword, newPassword } = body || {};

    const data: any = {};
    if (name) data.name = name;

    if (currentPassword || newPassword) {
      if (!currentPassword || !newPassword) {
        return NextResponse.json({ error: "Both currentPassword and newPassword are required to change password" }, { status: 400 });
      }

      const user = await userService.findUnique({ id: session.user.id });
      const existingHash = user?.hashedPassword;
      if (!existingHash) return NextResponse.json({ error: "No password set for this user" }, { status: 400 });

      const ok = await bcrypt.compare(currentPassword, existingHash);
      if (!ok) return NextResponse.json({ error: "Incorrect current password" }, { status: 403 });

      data.hashedPassword = await bcrypt.hash(newPassword, 10);
    }

    if (Object.keys(data).length === 0) return NextResponse.json({ error: "No changes provided" }, { status: 400 });

    const updated = await userService.update({ id: session.user.id }, data);

    return NextResponse.json({ id: updated.id, name: updated.name, email: updated.email, role: updated.role });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
