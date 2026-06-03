import { MongoClient, ObjectId } from 'mongodb';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '..', '.env') });

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const db = client.db('FeedbackPortal2');

const coOrphanIds = [
  '690723c178529e9646b0c914','690723c178529e9646b0c915','690723c178529e9646b0c916',
  '690723c178529e9646b0c917','690723c178529e9646b0c918','690723c178529e9646b0c919',
  '690723c178529e9646b0c91a','690723c178529e9646b0c91b','690723c178529e9646b0c91c',
  '690723c178529e9646b0c91d','690723c178529e9646b0c91e','690723c178529e9646b0c91f',
  '690723c178529e9646b0c920','690723c178529e9646b0c921','690723c178529e9646b0c922',
  '690723c178529e9646b0c923','690723c178529e9646b0c924','690723c178529e9646b0c925',
  '690723c178529e9646b0c926','690723c178529e9646b0c927','690723c178529e9646b0c928',
  '690723c178529e9646b0c929','690723c178529e9646b0c92a','690723c178529e9646b0c92b',
  '690723c178529e9646b0c92c'
];

// Check how many of these are now in facultyAssignments
const found = await db.collection('facultyAssignments').find({
  _id: { $in: coOrphanIds.map(id => new ObjectId(id)) }
}).toArray();

console.log(`Found in facultyAssignments: ${found.length} / 25`);
if (found.length > 0) {
  const s = found[0];
  const subj = await db.collection('subjects').findOne({ _id: new ObjectId(String(s.subjectId)) }).catch(() => null);
  const staff = await db.collection('staff').findOne({ _id: new ObjectId(String(s.staffId)) }).catch(() => null);
  console.log(`Sample: ${s._id} → ${staff?.name || 'unknown'} / ${subj?.name || 'unknown'} (restored=${s.restored})`);
}

// Count total orphaned feedback now
const allAssignIds = (await db.collection('facultyAssignments').find({}, { projection: { _id: 1 } }).toArray()).map(a => String(a._id));
const assignIdSet = new Set(allAssignIds);
const allFeedback = await db.collection('feedback').find({}, { projection: { assignmentId: 1 } }).toArray();
const orphaned = allFeedback.filter(f => !assignIdSet.has(f.assignmentId));

console.log(`\nTotal faculty assignments: ${allAssignIds.length}`);
console.log(`Total feedback records   : ${allFeedback.length}`);
console.log(`Still orphaned feedback  : ${orphaned.length}`);
console.log(`Linked feedback records  : ${allFeedback.length - orphaned.length}`);

if (orphaned.length > 0) {
  const remaining = [...new Set(orphaned.map(f => f.assignmentId))];
  console.log(`\nRemaining orphaned assignment IDs (${remaining.length}):`);
  remaining.forEach(id => console.log(`  ${id}`));
}

await client.close();
