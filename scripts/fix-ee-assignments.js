// scripts/fix-ee-assignments.js
const { MongoClient, ObjectId } = require('mongodb');

async function runDataFix() {
  const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!MONGO_URI) {
    console.error("ERROR: MONGO_URI not found in environment.");
    process.exit(1);
  }

  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    const db = client.db(process.env.DB_NAME || 'feedbackPortal');
    console.log("Connected to database.");

    // --- Define the Correct IDs ---
    const SYEE_ACADEMIC_YEAR_ID = "68fc86be99ba276515402d22";
    const EE_DEPARTMENT_ID = "68f6390b641c7bcb2781b39d";

    // --- Find all subjects for SYEE ---
    const syeeSubjects = await db.collection('subjects').find({
      academicYearId: SYEE_ACADEMIC_YEAR_ID
    }).toArray();
    const syeeSubjectIds = syeeSubjects.map(s => s._id ? s._id.toString() : s.id).filter(Boolean);
    console.log(`Found ${syeeSubjects.length} subjects for SYEE.`);

    // --- Find assignments for these subjects that have the WRONG academicYearId ---
    const brokenAssignments = await db.collection('facultyAssignments').find({
      subjectId: { $in: syeeSubjectIds },
      academicYearId: { $ne: SYEE_ACADEMIC_YEAR_ID }
    }).toArray();

    if (brokenAssignments.length === 0) {
      console.log("No incorrect assignments found. The data may already be correct.");
      return;
    }

    console.log(`Found ${brokenAssignments.length} assignments with incorrect academicYearId. Preparing to update...`);

    // --- Update them to the CORRECT academicYearId ---
    const result = await db.collection('facultyAssignments').updateMany(
      { _id: { $in: brokenAssignments.map(a => a._id) } },
      { $set: { academicYearId: SYEE_ACADEMIC_YEAR_ID } }
    );

    console.log(`\n--- DATA FIX COMPLETE ---`);
    console.log(`Successfully updated ${result.modifiedCount} assignment records.`);
    console.log(`-------------------------\n`);

  } catch (error) {
    console.error("An error occurred during the data fix:", error);
  } finally {
    await client.close();
    console.log("Database connection closed.");
  }
}

runDataFix();
