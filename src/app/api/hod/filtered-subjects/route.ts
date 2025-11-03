import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { staffService } from "@/lib/mongodb-services";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(req: NextRequest) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session?.user || session.user?.role !== "HOD") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hodUserId = session.user.id as string;
    const hodProfile = await staffService.findUnique({ where: { userId: hodUserId } });
    if (!hodProfile) {
      return NextResponse.json({ error: "HOD profile not found" }, { status: 404 });
    }

    const departmentId = hodProfile.departmentId;
    
    // Get semester from query parameter
    const url = new URL(req.url);
    const semester = url.searchParams.get('semester');
    const semesterNumber = semester ? Number(semester.charAt(0)) : 1; // Extract semester number from format like "Odd 2025-26"
    
    const db = await getDatabase();

    const subjects = await db.collection("departmentSubjects")
      .aggregate([
        // Match department
        {
          $match: {
            departmentId: new ObjectId(departmentId)
          }
        },
        // Join with subjects collection
        {
          $lookup: {
            from: "subjects",
            localField: "subjectId",
            foreignField: "_id",
            as: "subject"
          }
        },
        // Unwind subject array
        { $unwind: "$subject" },
        // Filter by semester
        {
          $match: {
            "subject.semester": semesterNumber
          }
        },
        // Join with academic years
        {
          $lookup: {
            from: "academicYears",
            localField: "subject.academicYearId",
            foreignField: "_id",
            as: "academicYear"
          }
        },
        // Unwind academic year
        {
          $unwind: {
            path: "$academicYear",
            preserveNullAndEmptyArrays: true
          }
        },
        // Project final shape
        {
          $project: {
            id: { $toString: "$subject._id" },
            name: "$subject.name",
            subjectCode: "$subject.subjectCode",
            semester: "$subject.semester",
            academicYearId: { $toString: "$subject.academicYearId" },
            academicYear: {
              id: { $toString: "$academicYear._id" },
              name: "$academicYear.name",
              abbreviation: "$academicYear.abbreviation"
            }
          }
        },
        // Sort by name
        { $sort: { name: 1 } }
      ]).toArray();

    return NextResponse.json(subjects);
  } catch (error) {
    console.error("Error fetching subjects:", error);
    return NextResponse.json({ error: "Failed to fetch subjects" }, { status: 500 });
  }
}