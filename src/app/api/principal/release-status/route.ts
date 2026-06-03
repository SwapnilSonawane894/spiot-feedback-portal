import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { hodReportReleaseService } from "@/lib/mongodb-services";

export async function GET() {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const status = await hodReportReleaseService.getStatus();
    return NextResponse.json(status);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch release status" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user?.role !== "PRINCIPAL") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { shouldBeReleased } = body || {};
    if (typeof shouldBeReleased !== "boolean") {
      return NextResponse.json({ error: "shouldBeReleased must be boolean" }, { status: 400 });
    }

    const result = await hodReportReleaseService.setStatus(shouldBeReleased);
    return NextResponse.json({ success: true, isReleased: result.isReleased });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update release status" }, { status: 500 });
  }
}
