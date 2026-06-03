import { MongoClient, ObjectId } from 'mongodb';
import { config } from 'dotenv';
import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env');
if (existsSync(envPath)) config({ path: envPath });

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const db = client.db('FeedbackPortal2');

const AID = '690723c178529e9646b0c920';

// 1. Does the assignment exist?
const assignment = await db.collection('facultyAssignments').findOne({ _id: new ObjectId(AID) });
console.log('\n1. Assignment found:', assignment ? JSON.stringify(assignment, null, 2) : '❌ NOT FOUND in facultyAssignments');

// 2. How many feedback records reference this assignmentId?
const fbCount = await db.collection('feedback').countDocuments({ assignmentId: AID });
console.log('\n2. Feedback records with assignmentId =', AID, ':', fbCount);

// 3. Total feedback and assignments summary
const totalFeedback = await db.collection('feedback').countDocuments();
const totalAssignments = await db.collection('facultyAssignments').countDocuments();
console.log('\n3. DB summary:');
console.log('   Total feedback records    :', totalFeedback);
console.log('   Total faculty assignments :', totalAssignments);

// 4. Find ALL unique assignmentIds referenced in feedback
const allFeedback = await db.collection('feedback').find({}, { projection: { assignmentId: 1 } }).toArray();
const allAssignIds = new Set(
  (await db.collection('facultyAssignments').find({}, { projection: { _id: 1 } }).toArray()).map(a => String(a._id))
);

const orphanedAids = [...new Set(
  allFeedback.filter(f => f.assignmentId && !allAssignIds.has(String(f.assignmentId)))
              .map(f => String(f.assignmentId))
)];

console.log('\n4. Orphaned assignmentIds (in feedback but NOT in facultyAssignments):');
if (orphanedAids.length === 0) {
  console.log('   ✅ None — all feedback records have valid assignments');
} else {
  console.log('   ❌', orphanedAids.length, 'orphaned assignmentId(s):');
  orphanedAids.forEach(id => {
    const count = allFeedback.filter(f => String(f.assignmentId) === id).length;
    console.log(`      ${id}  (${count} feedback records)`);
  });
}

// 5. Show all current assignments for the CO department for Odd semester  
const settings = await db.collection('settings').findOne({ type: 'semester' });
console.log('\n5. Current semester settings:', settings?.currentSemester, settings?.academicYear);

const sampleAssignments = await db.collection('facultyAssignments').find({}).limit(5).toArray();
console.log('\n6. Sample assignments (first 5):');
sampleAssignments.forEach(a => console.log(`   id=${a._id}  semester=${a.semester}  subjectId=${a.subjectId}  departmentId=${a.departmentId}`));

await client.close();
console.log('\nDone.');
