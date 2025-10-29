// scripts/report-ee-assignments.js
const { MongoClient } = require('mongodb');

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
    const DEPT = '68f6390b641c7bcb2781b39d';

    const depLinks = await db.collection('departmentSubjects').find({ departmentId: DEPT }).toArray();
    const subjIds = depLinks.map(d => d.subjectId);
    console.log('departmentSubjects count', depLinks.length);
    console.log('subjectIds', subjIds.join(','));

    const assigns = await db.collection('facultyAssignments').find({ subjectId: { $in: subjIds } }).toArray();
    console.log('facultyAssignments count for dept subjects', assigns.length);

    const grouped = {};
    for (const a of assigns) {
      const ay = a.academicYearId || '__null__';
      const staff = a.staffId || '__no_staff__';
      grouped[ay] = grouped[ay] || {};
      grouped[ay][staff] = (grouped[ay][staff] || 0) + 1;
    }
    console.log('grouped by academicYearId -> staff counts');
    console.log(JSON.stringify(grouped, null, 2));

    console.log('\nSample assignments (first 200 shown):');
    for (let i = 0; i < Math.min(assigns.length, 200); i++) console.log(JSON.stringify(assigns[i]));

  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

run();
