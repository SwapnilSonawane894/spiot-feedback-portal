const { MongoClient, ObjectId } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
if (!MONGO_URI) {
  console.error('Please set MONGO_URI or MONGODB_URI in the environment');
  process.exit(1);
}

const CO_DEPT_ID = '68f6390b641c7bcb2781b39c';

async function fixNullAcademicYears() {
  const client = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db('feedback');
    const facultyAssignments = db.collection('facultyAssignments');
    const departmentSubjects = db.collection('departmentSubjects');

    // Find assignments in CO with missing or null academicYearId
    const missingFilter = {
      departmentId: CO_DEPT_ID,
      $or: [ { academicYearId: { $exists: false } }, { academicYearId: null }, { academicYearId: '' } ]
    };
    const orphanAssignments = await facultyAssignments.find(missingFilter).toArray();
    console.log(`Found ${orphanAssignments.length} CO assignments with missing academicYearId`);

    let updatedCount = 0;
    const updatedIds = [];
    for (const a of orphanAssignments) {
      const subjId = a.subjectId;
      if (!subjId) continue;

      // Try to find departmentSubjects row for CO matching subjectId (master) or junction (_id)
      const clauses = [];
      // subjectId stored as string pointing to master subject id
      clauses.push({ departmentId: CO_DEPT_ID, subjectId: subjId });
      // subjectId could be stored as ObjectId string matching departmentSubjects._id
      if (ObjectId.isValid(subjId)) {
        clauses.push({ departmentId: CO_DEPT_ID, _id: new ObjectId(subjId) });
      }

      const found = await departmentSubjects.findOne({ $or: clauses });
      if (found && (found.academicYearId || (found.academicYear && (found.academicYear.id || found.academicYear._id)))) {
        const yearId = found.academicYearId ? String(found.academicYearId) : String(found.academicYear.id || found.academicYear._id);
        const res = await facultyAssignments.updateOne({ _id: a._id }, { $set: { academicYearId: yearId, updatedAt: new Date() } });
        if (res.modifiedCount && res.modifiedCount > 0) {
          updatedCount += 1;
          updatedIds.push(a._id.toString());
        }
      }
    }

    console.log(`\n✅ Updated ${updatedCount} assignments with academicYearId from departmentSubjects`);
    if (updatedIds.length > 0) console.log('Updated assignment ids sample:', updatedIds.slice(0, 20));
    console.log('\nDone');

  } catch (error) {
    console.error('❌ Error:', error.message || error);
  } finally {
    await client.close();
  }
}

fixNullAcademicYears();
