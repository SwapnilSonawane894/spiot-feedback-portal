require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
if (!MONGO_URI) {
  console.error('\nERROR: No MongoDB connection string found in environment.');
  console.error("Set MONGO_URI or MONGODB_URI and re-run:\n  export MONGODB_URI='your-connection-string'\n  node scripts/copy-ee-ce-data-to-feedback.js\n");
  process.exit(1);
}

const EE_DEPT = '68f6390b641c7bcb2781b39d';
const CE_DEPT = '68f6390b641c7bcb2781b39e';
const DEPTS = [EE_DEPT, CE_DEPT];

(async () => {
  const client = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  try {
    await client.connect();
    const srcDb = client.db('feedbackPortal');
    const dstDb = client.db('feedback');

    const summary = {};

    for (const deptId of DEPTS) {
      summary[deptId] = { departmentSubjects: 0, users: 0, facultyAssignments: 0 };

      // departmentSubjects
      const deptSubjects = await srcDb.collection('departmentSubjects').find({ departmentId: deptId }).toArray();
      for (const doc of deptSubjects) {
        const _doc = { ...doc };
        try {
          await dstDb.collection('departmentSubjects').replaceOne({ _id: _doc._id }, _doc, { upsert: true });
          summary[deptId].departmentSubjects += 1;
        } catch (e) {
          console.error('Error upserting departmentSubject', _doc._id, e.message);
        }
      }

      // users
      const users = await srcDb.collection('users').find({ departmentId: deptId }).toArray();
      for (const u of users) {
        const _u = { ...u };
        try {
          await dstDb.collection('users').replaceOne({ _id: _u._id }, _u, { upsert: true });
          summary[deptId].users += 1;
        } catch (e) {
          console.error('Error upserting user', _u._id, e.message);
        }
      }

      // facultyAssignments
      const assignments = await srcDb.collection('facultyAssignments').find({ departmentId: deptId }).toArray();
      for (const a of assignments) {
        const _a = { ...a };
        try {
          await dstDb.collection('facultyAssignments').replaceOne({ _id: _a._id }, _a, { upsert: true });
          summary[deptId].facultyAssignments += 1;
        } catch (e) {
          console.error('Error upserting facultyAssignment', _a._id, e.message);
        }
      }
    }

    console.log('\nCOPY SUMMARY:');
    for (const [dept, s] of Object.entries(summary)) {
      console.log(' Dept', dept);
      console.log('  departmentSubjects ->', s.departmentSubjects);
      console.log('  users             ->', s.users);
      console.log('  facultyAssignments->', s.facultyAssignments);
    }

    // re-run quick verification counts from dstDb
    for (const deptId of DEPTS) {
      const dsCount = await dstDb.collection('departmentSubjects').countDocuments({ departmentId: deptId });
      const usersCount = await dstDb.collection('users').countDocuments({ departmentId: deptId });
      const assignCount = await dstDb.collection('facultyAssignments').countDocuments({ departmentId: deptId });
      console.log(`\nVERIFICATION for ${deptId}: deptSubjects=${dsCount} users=${usersCount} facultyAssignments=${assignCount}`);
    }

    await client.close();
    console.log('\nDone.');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
