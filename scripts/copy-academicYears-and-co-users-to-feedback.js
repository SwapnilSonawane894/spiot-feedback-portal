const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
const CO_DEPT_ID = '68f6390b641c7bcb2781b39c';

async function copyData() {
  const client = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const wrongDb = client.db('feedbackPortal');
    const correctDb = client.db('feedback');

    // Copy academicYears
    const ays = await wrongDb.collection('academicYears').find({}).toArray();
    console.log(`📦 Found ${ays.length} academicYears in feedbackPortal`);
    if (ays.length > 0) {
      const ayOps = ays.map(d => ({
        replaceOne: { filter: { _id: d._id }, replacement: d, upsert: true }
      }));
      const ayRes = await correctDb.collection('academicYears').bulkWrite(ayOps);
      console.log(`  ✅ academicYears upserted: ${ayRes.upsertedCount + ayRes.modifiedCount}`);
    }

    // Copy CO users
    const users = await wrongDb.collection('users').find({ departmentId: CO_DEPT_ID }).toArray();
    console.log(`\n📦 Found ${users.length} users in CO department in feedbackPortal`);
    if (users.length > 0) {
      const userOps = users.map(d => ({
        replaceOne: { filter: { _id: d._id }, replacement: d, upsert: true }
      }));
      const userRes = await correctDb.collection('users').bulkWrite(userOps);
      console.log(`  ✅ users upserted: ${userRes.upsertedCount + userRes.modifiedCount}`);
    }

    // Verify counts
    const coUsersCount = await correctDb.collection('users').countDocuments({ departmentId: CO_DEPT_ID });
    const ayCount = await correctDb.collection('academicYears').countDocuments();
    console.log(`\n📊 verification: feedback DB academicYears=${ayCount}, CO users=${coUsersCount}`);

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.close();
  }
}

copyData();
