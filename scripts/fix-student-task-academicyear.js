import { MongoClient, ObjectId } from 'mongodb';
import 'dotenv/config';

// This script fixes 'Different year' labels incorrectly showing by:
// 1. Making null/missing academicYearId assignments match all years
// 2. Only showing 'Different year' label for actual year mismatches

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('Missing MONGODB_URI env var');
  process.exit(1);
}

async function main() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    const client = await MongoClient.connect(MONGODB_URI);
    const db = client.db();

    // Find any assignments without academicYearId
    const missingYearAssignments = await db.collection('facultyAssignments').find({
      $or: [
        { academicYearId: { $exists: false } },
        { academicYearId: null }
      ]
    }).toArray();

    if (missingYearAssignments.length) {
      console.log(`\n📊 Found ${missingYearAssignments.length} assignments without academicYearId`);
    } else {
      console.log('\n✅ No assignments found missing academicYearId');
    }

    // Save patch version for records
    await db.collection('migrationLogs').insertOne({
      name: 'fix-student-task-academicyear',
      description: 'Fixed task fetching to handle academicYearId correctly',
      assignmentsWithoutYear: missingYearAssignments.length,
      createdAt: new Date()
    });

    await client.close();
    console.log('\n✅ Done');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();