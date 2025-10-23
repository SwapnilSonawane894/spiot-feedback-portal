import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { semesterSettingsService } from "@/lib/mongodb-services";

export async function GET() {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const settings = await semesterSettingsService.get();
    const semesterString = semesterSettingsService.getCurrentSemesterString(
      settings.currentSemester,
      settings.academicYear
    );

    return NextResponse.json({ semesterString });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch semester" }, { status: 500 });
  }
}
