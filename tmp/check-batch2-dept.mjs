import { MongoClient, ObjectId } from 'mongodb';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const db = client.db('FeedbackPortal2');

// These 13 orphans have Civil Engineering students - find what dept they belong to
const batch2 = [
  '69082d3478529e9646b0c9b8',
  '69082d3478529e9646b0c9bb',
  '69082d3478529e9646b0c9c1',
  '69082d3478529e9646b0c9c2',
  '69082d3478529e9646b0c9c4',
  '69082d3478529e9646b0c9c5',
  '69082d3478529e9646b0c9ac',
  '69082d3478529e9646b0c9b2',
  '69082d3478529e9646b0c9b6',
  '69082d3478529e9646b0c9b7',
  '69082d3478529e9646b0c9bc',
  '69082d3478529e9646b0c9c0',
  '69082d3478529e9646b0c9c3',
];

const CE_DEPT_ID = '6906ec3bb1773184f4f56baf';

// Get current CE assignments
const ceAssignments = await db.collection('facultyAssignments')
  .find({ departmentId: CE_DEPT_ID })
  .toArray();
console.log(`Current CE assignments: ${ceAssignments.length}`);

// Build student->assignments map for CE
const ceStudentAssignments = new Map();
for (const a of ceAssignments) {
  const fbs = await db.collection('feedback').find({ assignmentId: String(a._id) }).toArray();
  for (const fb of fbs) {
    const sid = String(fb.studentId);
    if (!ceStudentAssignments.has(sid)) ceStudentAssignments.set(sid, []);
    ceStudentAssignments.get(sid).push(a);
  }
}

// For each batch-2 orphan, check its student against CE assignments
const orphanToAssignment = new Map();
let allResolved = true;
let unresolved = [];

for (const orphanId of batch2) {
  const fb = await db.collection('feedback').findOne({ assignmentId: orphanId });
  if (!fb) { console.log(`${orphanId}: no feedback`); continue; }
  
  const sid = String(fb.studentId);
  const assignments = ceStudentAssignments.get(sid) || [];
  
  // There will be multiple CE assignments for this student - we need to identify WHICH one
  // maps to this orphan. The orphan IDs are sequential (created same day) so they correspond
  // to the original CE assignments that were also wiped and recreated.
  
  console.log(`\nOrphan ${orphanId}: student ${sid}`);
  console.log(`  CE assignments for this student: ${assignments.length}`);
  
  if (assignments.length === 0) {
    console.log(`  → NOT resolvable via CE student overlap`);
    allResolved = false;
    unresolved.push(orphanId);
  }
  
  for (const a of assignments.slice(0,5)) {
    let subjName = ''; let staffName = '';
    try { const s = await db.collection('subjects').findOne({ _id: new ObjectId(String(a.subjectId)) }); if (s) subjName = s.name; } catch {}
    try { const s = await db.collection('staff').findOne({ _id: new ObjectId(String(a.staffId)) }); if (s) staffName = s.name; } catch {}
    console.log(`    ${a._id}: ${subjName} / ${staffName} (${a.semester})`);
  }
}

console.log('\n=== Summary ===');
console.log(`Unresolved batch-2 orphans: ${unresolved.length}`);

// Check if CE also had its assignments wiped and recreated
// by looking at the creation date of current CE assignments vs the batch-2 orphan IDs
const ceAssignmentDates = ceAssignments.map(a => {
  const hex = String(a._id).substring(0, 8);
  const ts = parseInt(hex, 16) * 1000;
  return { id: String(a._id), date: new Date(ts).toISOString().slice(0,10) };
});
const dateCounts = {};
for (const { date } of ceAssignmentDates) {
  dateCounts[date] = (dateCounts[date] || 0) + 1;
}
console.log('\nCE assignment creation dates:');
for (const [date, count] of Object.entries(dateCounts).sort()) {
  console.log(`  ${date}: ${count} assignments`);
}

await client.close();
