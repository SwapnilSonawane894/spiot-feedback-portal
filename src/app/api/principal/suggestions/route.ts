import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { principalSuggestionService, staffService } from "@/lib/mongodb-services";

export async function GET(req: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const hodStaffId = url.searchParams.get("hodStaffId");
    const semester = url.searchParams.get("semester");

    if (!hodStaffId || !semester) {
      return NextResponse.json({ error: "hodStaffId and semester required" }, { status: 400 });
    }

    const suggestion = await principalSuggestionService.findUnique({
      hodStaffId_semester: { hodStaffId, semester },
    });

    return NextResponse.json({ suggestion });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch suggestion" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user?.role !== "PRINCIPAL") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { hodStaffId, semester, content } = body;

    if (!hodStaffId || !semester) {
      return NextResponse.json({ error: "hodStaffId and semester required" }, { status: 400 });
    }

    const suggestion = await principalSuggestionService.upsert(
      { hodStaffId, semester },
      { content: content || "", principalId: session.user.id }
    );

    return NextResponse.json({ suggestion });
  } catch (error) {
    return NextResponse.json({ error: "Failed to save suggestion" }, { status: 500 });
  }
}
