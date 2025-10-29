// scripts/final-diagnostic.js
const { MongoClient, ObjectId } = require('mongodb');

async function runFinalDiagnostic() {
  const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!MONGO_URI) {
    console.error("ERROR: MONGO_URI not found. Please set it in your .env file.");
    process.exit(1);
  }

  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    const db = client.db('feedbackPortal');
    console.log("Connected to database for final diagnostic.");

    // --- Define the Ground Truth for the SYEE student ---
    const STUDENT_EMAIL = "23213070244";
    const SYEE_ACADEMIC_YEAR_ID_STR = "68fc86be99ba276515402d22";
    const EE_DEPARTMENT_ID_STR = "68f6390b641c7bcb2781b39d";
    
    // --- 1. Find the assignments my BROKEN code is finding (the 9 incorrect ones) ---
    const departmentSubjectLinks = await db.collection('departmentSubjects').find({ departmentId: EE_DEPARTMENT_ID_STR }).toArray();
    const allSubjectIds = departmentSubjectLinks.map(link => link.subjectId);
    const allSubjectIdQuery = [...allSubjectIds, ...allSubjectIds.map(id => new ObjectId(id))];
    const academicYearIdQuery = [SYEE_ACADEMIC_YEAR_ID_STR, new ObjectId(SYEE_ACADEMIC_YEAR_ID_STR)];

    const incorrectAssignments = await db.collection('facultyAssignments').find({
      subjectId: { $in: allSubjectIdQuery },
      academicYearId: { $in: academicYearIdQuery },
    }).toArray();

    console.log(`\n--- Found ${incorrectAssignments.length} total assignments using the flawed logic ---`);

    // --- 2. Find the assignments my CORRECT code SHOULD be finding ---
    const correctDeptSubjectLinks = await db.collection('departmentSubjects').find({ 
        departmentId: EE_DEPARTMENT_ID_STR,
        academicYearId: SYEE_ACADEMIC_YEAR_ID_STR
    }).toArray();
    
    const correctSubjectIds = correctDeptSubjectLinks.map(link => link.subjectId);
    const correctSubjectIdQuery = [...correctSubjectIds, ...correctSubjectIds.map(id => new ObjectId(id))];
    
    const correctAssignments = await db.collection('facultyAssignments').find({
      subjectId: { $in: correctSubjectIdQuery },
      academicYearId: { $in: academicYearIdQuery },
    }).toArray();

    console.log(`\n--- Found ${correctAssignments.length} total assignments using the CORRECTED logic ---`);

    // --- 3. Identify the extra, incorrect assignments ---
    const correctAssignmentIds = new Set(correctAssignments.map(a => a._id.toString()));
    const extraAssignments = incorrectAssignments.filter(a => !correctAssignmentIds.has(a._id.toString()));

    if (extraAssignments.length > 0) {
      console.log(`\n--- IDENTIFIED ${extraAssignments.length} EXTRA ASSIGNMENTS ---`);
      console.log("These assignments are being incorrectly included because their subjects are linked to the EE department, but NOT to the SYEE academic year.");
      for (const assignment of extraAssignments) {
        const subject = await db.collection('subjects').findOne({ _id: new ObjectId(assignment.subjectId) });
        console.log("\n--- Incorrectly Included Assignment ---");
        console.log(`Assignment ID: ${assignment._id}`);
        console.log(`Subject Name: ${subject ? subject.name : 'Unknown'}`);
        console.log(`Assignment academicYearId: ${assignment.academicYearId}`);
        console.log(`Subject's master academicYearId: ${subject ? subject.academicYearId : 'N/A'}`);
      }
      console.log("---------------------------------------\n");
    } else {
      console.log("\n--- No extra assignments found. The issue may be different. ---");
    }


  } catch (error) {
    console.error("An error occurred during the diagnostic:", error);
  } finally {
    await client.close();
    console.log("Database connection closed.");
  }
}

runFinalDiagnostic();
