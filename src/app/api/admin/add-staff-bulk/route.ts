import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getDb } from "@/lib/mongodb";
import bcrypt from "bcrypt";

const staffMembers = [
  { name: "Mrs. Bhosale S. S.", email: "bhosale@gmail.com", password: "bhosale", department: "CO" },
  { name: "Mrs. Raut D. A", email: "raut@gmail.com", password: "raut", department: "EE" },
  { name: "MS. Rajwade V. V", email: "rajwade@gmail.com", password: "rajwade", department: "CO" },
  { name: "Ms. Wagh S. S.", email: "wagh@gmail.com", password: "wagh", department: "CO" },
  { name: "Mr. Kadam R. C.", email: "kadam@gmail.com", password: "kadam", department: "CO" },
  { name: "Ms. Kamble P. D.", email: "kamble@gmail.com", password: "Kamble", department: "CO" },
  { name: "Mr. Jagtap R. G.", email: "jagtap@gmail.com", password: "jagtap", department: "NA" },
  { name: "Ms. Dhapte S. N.", email: "dhapte@gmail.com", password: "dhapte", department: "NA" },
  { name: "Mrs. Bankar P. S.", email: "bankar@gmail.com", password: "bankar", department: "NA" },
  { name: "Mr. Hajare S. K.", email: "hajare@gmail.com", password: "hajare", department: "CE" },
  { name: "Mr. Khatake R. B.", email: "khatake@gmail.com", password: "khatake", department: "NA" },
  { name: "Ms. Shinde P.J.", email: "shinde@gmail.com", password: "shinde", department: "NA" },
  { name: "Mr. Gharjare V. N.", email: "gharjare@gmail.com", password: "gharjare", department: "NA" },
  { name: "Ms. Bhoite D. C.", email: "bhoite@gmail.com", password: "bhoite", department: "NA" },
  { name: "Mr. Pawar A. N.", email: "pawar@gmail.com", password: "pawar", department: "ME" },
  { name: "Mr. Bhoite M. A.", email: "bhoite2@gmail.com", password: "bhoite2", department: "ME" },
  { name: "Mrs. Nagawade M. S.", email: "nagawade@gmail.com", password: "nagawade", department: "NA" },
  { name: "Mr. Wagh S.T.", email: "wagh2@gmail.com", password: "wagh2", department: "NA" },
];

export async function POST(request: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDb();
    const usersCollection = db.collection('users');
    const staffCollection = db.collection('staff');
    const departmentsCollection = db.collection('departments');

    const departments = await departmentsCollection.find({}).toArray();
    const departmentMap = new Map();
    for (const dept of departments) {
      if (dept.abbreviation) {
        departmentMap.set(dept.abbreviation.toUpperCase(), dept._id.toString());
      }
    }

    const updateResult = await staffCollection.updateMany(
      {},
      { $unset: { employeeId: "", designation: "" } }
    );

    let addedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const results = [];

    for (const member of staffMembers) {
      try {
        const existingUser = await usersCollection.findOne({ email: member.email });

        if (existingUser) {
          skippedCount++;
          results.push({ name: member.name, status: 'skipped', reason: 'already exists' });
          continue;
        }

        const deptAbbr = member.department.toUpperCase();
        const departmentId = departmentMap.get(deptAbbr);

        if (!departmentId) {
          errorCount++;
          results.push({ name: member.name, status: 'error', reason: `Department ${member.department} not found` });
          continue;
        }

        const hashedPassword = await bcrypt.hash(member.password, 10);

        const userResult = await usersCollection.insertOne({
          name: member.name,
          email: member.email,
          hashedPassword,
          role: 'STAFF',
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        await staffCollection.insertOne({
          userId: userResult.insertedId.toString(),
          departmentId,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        addedCount++;
        results.push({ name: member.name, status: 'added', department: member.department });
      } catch (error) {
        errorCount++;
        results.push({ name: member.name, status: 'error', reason: (error as Error).message });
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        added: addedCount,
        skipped: skippedCount,
        errors: errorCount,
        total: staffMembers.length,
        fieldsRemoved: updateResult.modifiedCount
      },
      results
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to add staff members", details: (error as Error).message }, { status: 500 });
  }
}
