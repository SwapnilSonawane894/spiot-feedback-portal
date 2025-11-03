import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
    
    const updateData = {
      name,
      subjectCode,
      semester: Number(semester),
      academicYearId: new ObjectId(academicYearId),
      updatedAt: new Date()
    };

    await db.collection("subjects").updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    await db.collection("departmentSubjects").deleteMany({ subjectId: new ObjectId(id) });

    const junctionDocs = departmentIds.map((deptId: string) => ({
      departmentId: new ObjectId(deptId),
      subjectId: new ObjectId(id),
      subjectCode: subjectCode,
      academicYearId: new ObjectId(academicYearId),
      semester: Number(semester),
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    await db.collection("departmentSubjects").insertMany(junctionDocs);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating subject:", error);
    return NextResponse.json({ error: "Failed to update subject" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session?.user || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDatabase();

    await db.collection("departmentSubjects").deleteMany({ subjectId: new ObjectId(id) });
    
    await db.collection("facultyAssignments").deleteMany({ subjectId: new ObjectId(id) });
    
    await db.collection("subjects").deleteOne({ _id: new ObjectId(id) });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting subject:", error);
    return NextResponse.json({ error: "Failed to delete subject" }, { status: 500 });
  }
}
