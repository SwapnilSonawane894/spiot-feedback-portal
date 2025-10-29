const { MongoClient, ObjectId } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
const STUDENT_EMAIL = process.env.STUDENT_EMAIL || '23213070244';

if (!MONGO_URI) {
  console.error('ERROR: MONGODB_URI not set');
  process.exit(1);
}

(async () => {
  const client = new MongoClient(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true, serverSelectionTimeoutMS: 5000 });
  try {
    await client.connect();
    const db = client.db('feedback');

    console.log('Running diagnostic for STUDENT_EMAIL=', STUDENT_EMAIL);

    const student = await db.collection('users').findOne({ email: STUDENT_EMAIL });
    if (!student) {
      console.log('--- FAILED: Could not find student with that email ---');
      await client.close();
      process.exit(0);
    }

    const studentDept = student.departmentId ? await db.collection('departments').findOne({ _id: new ObjectId(student.departmentId) }) : null;
    const studentYear = student.academicYearId ? await db.collection('academicYears').findOne({ _id: new ObjectId(student.academicYearId) }) : null;

    console.log('\n--- Student Info ---');
    console.dir(student, { depth: 4 });
    console.log('\n--- Department Info ---');
    console.dir(studentDept, { depth: 4 });
    console.log('\n--- Academic Year Info ---');
    console.dir(studentYear, { depth: 4 });

    if (student) {
      const departmentId = String(student.departmentId);

      const departmentSubjectLinks = await db.collection('departmentSubjects').find({ departmentId: departmentId }).toArray();
      const subjectIdsFromLinks = departmentSubjectLinks.map(ds => ds.subjectId).filter(Boolean).map(id => String(id));

      console.log(`\n--- Found ${departmentSubjectLinks.length} subject links for department ${studentDept?.abbreviation || departmentId} ---`);
      console.log('Sample links (first 5):');
      console.dir(departmentSubjectLinks.slice(0,5), { depth: 3 });

      const assignmentsForDeptSubjects = subjectIdsFromLinks.length ? await db.collection('facultyAssignments').find({ subjectId: { $in: subjectIdsFromLinks } }).toArray() : [];
      console.log(`\n--- Found ${assignmentsForDeptSubjects.length} assignments linked to this department's subjects ---`);

      const finalAssignments = assignmentsForDeptSubjects.filter(a => a.academicYearId && String(a.academicYearId) === String(student.academicYearId));
      console.log(`\n--- Found ${finalAssignments.length} assignments matching the student's academic year ---`);
      console.log('Final assignments (up to 50):');
      console.dir(finalAssignments.slice(0,50), { depth: 3 });
    }

    await client.close();
  } catch (err) {
    console.error('Error during diagnostic:', err);
    try { await client.close(); } catch(e){}
    process.exit(1);
  }
})();
