const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
const CO_DEPT_ID = '68f6390b641c7bcb2781b39c';

async function copyJunctions() {
  const client = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const wrongDb = client.db('feedbackPortal');
    const correctDb = client.db('feedback');
    const wrongColl = wrongDb.collection('departmentSubjects');
    const correctColl = correctDb.collection('departmentSubjects');

    const rows = await wrongColl.find({ departmentId: CO_DEPT_ID }).toArray();
    console.log(`📦 Found ${rows.length} departmentSubjects in feedbackPortal for CO`);

    if (rows.length === 0) {
      console.log('⚠️  No rows found to copy.');
      return;
    }

    const ops = rows.map(r => ({
      replaceOne: {
        filter: { _id: r._id },
        replacement: r,
        upsert: true
      }
    }));

    const res = await correctColl.bulkWrite(ops);
    console.log('\n✅ Bulk upsert complete');
    console.log(`  - upsertedCount: ${res.upsertedCount}`);
    console.log(`  - modifiedCount: ${res.modifiedCount}`);

    // Verification
    const totalCO = await correctColl.countDocuments({ departmentId: CO_DEPT_ID });
    console.log(`\n📊 verification: feedback DB departmentSubjects for CO = ${totalCO}`);

    const sample = await correctColl.find({ departmentId: CO_DEPT_ID }).limit(10).toArray();
    console.log('\n🔎 Sample COPIED junction _id values (up to 10):');
    sample.forEach(s => console.log(' -', s._id.toString()));

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err);
  } finally {
    await client.close();
  }
}

copyJunctions();
