/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { staffService } from "@/lib/mongodb-services";
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(request: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDatabase();

    // Get HOD's department for filtering if user is HOD
    let departmentId = null;
    if (session.user?.role === "HOD") {
      const hodUserId = session.user.id as string;
      const hodProfile = await staffService.findUnique({ where: { userId: hodUserId } });
      if (!hodProfile) {
        return NextResponse.json({ error: "HOD profile not found" }, { status: 404 });
      }
      departmentId = hodProfile.departmentId;
    } else if (session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized. Only admin and HODs can view subjects." }, { status: 401 });
    }
    
    const subjects = await db.collection("subjects")
      .aggregate([
        // Match subjects for HOD's department if applicable
        ...(departmentId ? [{
          $match: {
            departmentIds: new ObjectId(departmentId)
          }
        }] : []),
        // Join with academic years
        {
          $lookup: {
            from: "academicYears",
            localField: "academicYearId",
            foreignField: "_id",
            as: "academicYear"
          }
        },
        {
          $unwind: {
            path: "$academicYear",
            preserveNullAndEmptyArrays: true
          }
        },
        // Join with departments
        {
          $lookup: {
            from: "departments",
            let: { departmentIds: "$departmentIds" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $in: ["$_id", "$$departmentIds"]
                  }
                }
              }
            ],
            as: "departments"
          }
        },
        // Project the final format
        {
          $project: {
            id: { $toString: "$_id" },
            name: 1,
            subjectCode: 1,
            semester: 1,
            academicYearId: { $toString: "$academicYearId" },
            academicYear: {
              id: { $toString: "$academicYear._id" },
              name: "$academicYear.name",
              abbreviation: "$academicYear.abbreviation"
            },
            departments: {
              $map: {
                input: "$departments",
                as: "dept",
                in: {
                  id: { $toString: "$$dept._id" },
                  name: "$$dept.name",
                  abbreviation: "$$dept.abbreviation"
                }
              }
            }
          }
        },
        {
          $sort: { name: 1 }
        }
      ])
      .toArray();

    // Debug logging for final results
    // console.log('📋 GET /api/subjects - Final results:');
    // console.log('  Count:', subjects.length);
    if (subjects.length > 0) {
      // console.log('  First subject:', JSON.stringify(subjects[0], null, 2));
    }

    return NextResponse.json(subjects);
  } catch (error) {
    // console.error(error);
    return NextResponse.json({ error: "Failed to fetch subjects" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  // For admin actions, redirect to admin API
  const adminUrl = new URL(request.url);
  adminUrl.pathname = '/api/admin/subjects';
  return NextResponse.redirect(adminUrl);
}
