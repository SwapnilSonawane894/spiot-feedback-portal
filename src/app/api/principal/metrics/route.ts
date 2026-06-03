import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { userService, departmentService } from "@/lib/mongodb-services";

export async function GET() {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user?.role !== "PRINCIPAL") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [hodCount, departmentCount, staffCount] = await Promise.all([
      userService.count({ role: "HOD" }),
      departmentService.findMany().then((d) => d.length),
      userService.count({ role: { $in: ["STAFF", "FACULTY"] } }),
    ]);

    return NextResponse.json({ hodCount, departmentCount, staffCount });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
