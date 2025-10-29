// scripts/simple-diagnostic.js
// Safe diagnostic: reads MONGODB_URI from env and looks up the student by email.
// Do NOT hardcode your DB credentials in repository files. Use the MONGODB_URI env var.

const { MongoClient, ObjectId } = require('mongodb');

// --- CONFIGURATION ---
const MONGO_URI = process.env.MONGODB_URI; // set this in your shell before running
const STUDENT_EMAIL = '23213070244';
const DB_NAME = process.env.DB_NAME || 'feedbackPortal';

if (!MONGO_URI) {
  console.error('ERROR: MONGODB_URI is not set. Do not hardcode credentials into files.');
  console.error('Set MONGODB_URI in your shell and re-run:');
  console.error('  export MONGODB_URI="mongodb+srv://<user>:<pw>@host/..."');
  process.exit(1);
}

async function runDiagnostic() {
  console.log(`Connecting to the database (${DB_NAME})...`);
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    console.log('Successfully connected to the database cluster.');

    const db = client.db(DB_NAME);
    const usersCollection = db.collection('users');

    console.log(`Searching for student with email: "${STUDENT_EMAIL}" in database "${DB_NAME}"...`);

    // Perform the simplest possible query.
    const student = await usersCollection.findOne({ email: STUDENT_EMAIL });

    console.log('\n--- DIAGNOSTIC RESULT ---');
    if (student) {
      console.log('SUCCESS: Found the student record.');
      // print a small, safe summary rather than the entire document
      console.log('Student _id:', student._id?.toString());
      console.log('email:', student.email);
      console.log('departmentId:', student.departmentId);
      console.log('academicYearId:', student.academicYearId);
      console.log('\n(full document below)');
      console.log(JSON.stringify(student, null, 2));
    } else {
      console.log('FAILURE: Could not find a student with that email.');
      console.log('STUDENT: null');
    }
    console.log('-------------------------\n');

  } catch (error) {
    console.error('An error occurred during the diagnostic:', error);
  } finally {
    await client.close();
    console.log('Database connection closed.');
  }
}

runDiagnostic();
