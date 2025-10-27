const { MongoClient } = require('mongodb');

const uri = process.env.MONGO_URI;
const dbName = process.env.DB_NAME || 'feedbackPortal';

if (!uri) {
  console.error('MONGO_URI environment variable is required.');
  process.exit(1);
}

async function cleanup() {
  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  try {
    await client.connect();
    const db = client.db(dbName);

    const result = await db.collection('departmentSubjects').updateMany(
      { academicYearId: 'null' },
      { $set: { academicYearId: null } }
    );

    console.log(`Normalized ${result.modifiedCount} academicYearId values`);
  } catch (err) {
    console.error('Cleanup failed:', err);
    process.exitCode = 2;
  } finally {
    await client.close();
  }
}

cleanup();
