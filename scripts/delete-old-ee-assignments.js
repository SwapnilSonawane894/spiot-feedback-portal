const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI || "";
const DB_NAME = process.env.DB_NAME || "feedbackPortal";

async function main() {
  if (!MONGO_URI) {
    console.error('MONGO_URI not set in env. Set it or export it before running.');
    process.exit(1);
  }

  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    const db = client.db(DB_NAME);

    console.log('🗑️  Deleting old EE assignments with invalid subject IDs...');

    // Delete old EE assignments
    const result = await db.collection('facultyAssignments').deleteMany({
      departmentId: '68f6390b641c7bcb2781b39d',  // EE department ID
      semester: 'Odd Semester 2025-26'
    });

    console.log(`✅ Deleted ${result.deletedCount} old EE assignments`);
  } catch (err) {
    console.error('Error while deleting old EE assignments:', err);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
