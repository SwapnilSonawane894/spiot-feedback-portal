import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { semesterSettingsService } from "@/lib/mongodb-services";

export async function GET() {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user?.role !== "ADMIN" && session.user?.role !== "HOD" && session.user?.role !== "STAFF" && session.user?.role !== "FACULTY") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await semesterSettingsService.get();
    const semesterString = semesterSettingsService.getCurrentSemesterString(
      settings.currentSemester,
      settings.academicYear
    );

    return NextResponse.json({
      ...settings,
      semesterString,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch semester settings" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { currentSemester, academicYear } = body;

    if (!currentSemester || currentSemester < 1 || currentSemester > 6) {
      return NextResponse.json({ error: "Invalid semester number (must be 1-6)" }, { status: 400 });
    }

    const updated = await semesterSettingsService.update({
      currentSemester: Number(currentSemester),
      academicYear,
    });

    const semesterString = semesterSettingsService.getCurrentSemesterString(
      updated.currentSemester,
      updated.academicYear
    );

    return NextResponse.json({
      ...updated,
      semesterString,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update semester settings" }, { status: 500 });
  }
}
