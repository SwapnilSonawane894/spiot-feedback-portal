import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { staffService, principalSuggestionService } from "@/lib/mongodb-services";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function POST(req: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user?.role !== "HOD") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { semester, hodResponse } = body;

    if (!semester) {
      return NextResponse.json({ error: "semester required" }, { status: 400 });
    }

    const staff = await staffService.findFirst({ where: { userId: session.user.id } });
    if (!staff) return NextResponse.json({ error: "Staff profile not found" }, { status: 404 });

    const db = await getDatabase();

    const suggestion = await principalSuggestionService.findUnique({
      hodStaffId_semester: { hodStaffId: staff.id, semester },
    });

    if (!suggestion) {
      return NextResponse.json({ error: "No principal suggestion found for this semester" }, { status: 404 });
    }

    await db.collection("principalSuggestions").updateOne(
      { _id: new ObjectId(suggestion.id) },
      {
        $set: {
          hodResponse: hodResponse || "",
          hodResponseUpdatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to save response" }, { status: 500 });
  }
}
