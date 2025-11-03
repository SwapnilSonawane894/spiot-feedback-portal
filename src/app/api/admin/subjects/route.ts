import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(req: NextRequest) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session?.user || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDatabase();
    
    const subjects = await db.collection("subjects")
      .aggregate([
        // First make sure departmentIds exists and is an array
        {
          $addFields: {
            departmentIds: { $ifNull: ["$departmentIds", []] }
          }
        },
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

    return NextResponse.json(subjects);
  } catch (error) {
    console.error("Error fetching subjects:", error);
    return NextResponse.json({ error: "Failed to fetch subjects" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session?.user || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, subjectCode, semester, academicYearId, departmentIds } = body;

    if (!name || !subjectCode || !semester || !academicYearId || !departmentIds || departmentIds.length === 0) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const db = await getDatabase();
    
    // Check for existing subject with this code in any of the departments
    const existingSubject = await db.collection("subjects").findOne({
      subjectCode,
      departmentIds: { $in: departmentIds.map((id: string) => new ObjectId(id)) }
    });

    if (existingSubject) {
      // Get department details for error message
      const dept = await db.collection("departments").findOne({ 
        _id: { $in: existingSubject.departmentIds }
      });
      const deptName = dept?.name || dept?.abbreviation || "a department";
      return NextResponse.json(
        { error: `Subject with code "${subjectCode}" already exists for ${deptName}` },
        { status: 400 }
      );
    }

    // Create new subject instance with departmentIds array
    const subjectData = {
      name,
      subjectCode,
      semester: Number(semester),
      academicYearId: new ObjectId(academicYearId),
      departmentIds: departmentIds.map((id: string) => new ObjectId(id)),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await db.collection("subjects").insertOne(subjectData);
    const subjectId = result.insertedId;

    // Get the created subject with all its relations
    const created = await db.collection("subjects")
      .aggregate([
        { $match: { _id: subjectId } },
        {
          $lookup: {
            from: "academicYears",
            localField: "academicYearId",
            foreignField: "_id",
            as: "academicYear"
          }
        },
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
        {
          $unwind: {
            path: "$academicYear",
            preserveNullAndEmptyArrays: true
          }
        },
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
        }
      ])
      .toArray();

    return NextResponse.json(created[0], { status: 201 });
  } catch (error) {
    console.error("Error creating subject:", error);
    return NextResponse.json({ error: "Failed to create subject" }, { status: 500 });
  }
}
