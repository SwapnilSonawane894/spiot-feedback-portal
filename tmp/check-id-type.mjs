import { MongoClient, ObjectId } from 'mongodb';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '..', '.env') });

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const db = client.db('FeedbackPortal2');

const testId = '690723c178529e9646b0c914';

// Try finding by string _id
const byString = await db.collection('facultyAssignments').findOne({ _id: testId });
console.log('By string _id:', byString ? JSON.stringify(byString).slice(0, 200) : 'NOT FOUND');

// Try finding by ObjectId
const byObjId = await db.collection('facultyAssignments').findOne({ _id: new ObjectId(testId) });
console.log('By ObjectId  :', byObjId ? JSON.stringify(byObjId).slice(0, 200) : 'NOT FOUND');

// Get total count
const total = await db.collection('facultyAssignments').countDocuments();
console.log('\nTotal facultyAssignments:', total);

// Get first 5 assignments sorted by _id to see what types exist
const all5 = await db.collection('facultyAssignments').find({}).limit(5).project({ _id: 1, staffId: 1, subjectId: 1, semester: 1, restored: 1 }).toArray();
for (const a of all5) {
  console.log(`  _id: ${typeof a._id} = ${a._id}  | restored=${a.restored}`);
}

// Check if any restored=true documents exist
const restored = await db.collection('facultyAssignments').find({ restored: true }).toArray();
console.log(`\nDocuments with restored=true: ${restored.length}`);
if (restored.length > 0) {
  const r = restored[0];
  console.log(`  _id type: ${typeof r._id}  value: ${r._id}`);
  console.log(`  staffId: ${r.staffId}  subjectId: ${r.subjectId}`);
}

await client.close();
