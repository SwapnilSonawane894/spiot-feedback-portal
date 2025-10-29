// scripts/find-missing-syee.js
const { MongoClient, ObjectId } = require('mongodb');

async function run() {
  const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!MONGO_URI) {
    console.error('MONGO_URI not set');
    process.exit(1);
  }

  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    const db = client.db('feedbackPortal');
    const SYEE = '68fc86be99ba276515402d22';
    const DEPT = '68f6390b641c7bcb2781b39d';

    const subjects = await db.collection('subjects').find({ academicYearId: SYEE }).toArray();
    console.log('subjects for SYEE total', subjects.length);
    for (const s of subjects) console.log('SUBJECT', s._id.toString(), s.name || '(no name)');

    const depLinks = await db.collection('departmentSubjects').find({ departmentId: DEPT, academicYearId: SYEE }).toArray();
    console.log('departmentSubjects for EE+SYEE count', depLinks.length);

    const depSubjectIds = new Set(depLinks.map(l => l.subjectId.toString()));
    for (const s of subjects) {
      if (!depSubjectIds.has(s._id.toString())) console.log('MISSING LINK ->', s._id.toString(), s.name || '(no name)');
    }
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

run();
