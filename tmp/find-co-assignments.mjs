/**
 * find-co-assignments.mjs — READ ONLY
 * Find all info about CO department assignments and the orphaned IDs
 */
import { MongoClient, ObjectId } from 'mongodb';
import { config } from 'dotenv';
import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '..', '.env') });

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const db = client.db('FeedbackPortal2');

// Find CO department
const depts = await db.collection('departments').find({}).toArray();
console.log('All departments:');
depts.forEach(d => console.log(`  ${d._id}  ${d.name}  ${d.abbreviation}`));

const coDept = depts.find(d => (d.abbreviation || '').toUpperCase() === 'CO' || (d.name || '').toUpperCase().includes('COMPUTER'));
console.log('\nCO dept:', coDept ? `${coDept._id} (${coDept.abbreviation})` : 'NOT FOUND');

if (coDept) {
  // Find current CO assignments
  const coAssignments = await db.collection('facultyAssignments').find({ departmentId: String(coDept._id) }).toArray();
  console.log(`\nCurrent CO facultyAssignments: ${coAssignments.length}`);
  coAssignments.forEach(a => console.log(`  ${a._id}  sem=${a.semester}  subjectId=${a.subjectId}  staffId=${a.staffId}`));

  // Find CO subjects
  const coSubjects = await db.collection('subjects').find({
    $or: [
      { departmentIds: coDept._id },
      { 'departments.id': String(coDept._id) },
      { departmentId: String(coDept._id) }
    ]
  }).toArray();
  console.log(`\nCO subjects: ${coSubjects.length}`);
  coSubjects.forEach(s => console.log(`  ${s._id}  name=${s.name}  semester=${s.semester}`));
}

// Now look at the orphaned IDs — which subjectId did they reference?
// We can look at the adjacent IDs in sequence to find their subjectId context.
// The IDs 690723c1... were created in a batch — find what other docs were created at same time.
const orphanPrefix = '690723c1';
const allAssigns = await db.collection('facultyAssignments').find({}).toArray();
const allFeedback = await db.collection('feedback').find({}, {
  projection: { assignmentId: 1, studentId: 1 }
}).toArray();
const existingIds = new Set(allAssigns.map(a => String(a._id)));

const orphanedAids = [...new Set(
  allFeedback.filter(f => f.assignmentId && !existingIds.has(String(f.assignmentId)))
             .map(f => String(f.assignmentId))
)];

console.log('\nAll orphaned IDs and their timestamps:');
orphanedAids.forEach(id => {
  const ts = new ObjectId(id).getTimestamp().toISOString();
  const fbCount = allFeedback.filter(f => String(f.assignmentId) === id).length;
  console.log(`  ${id}  created=${ts}  feedback=${fbCount}`);
});

// Find any assignment that was in the database and was deleted around same time (look in backup data structure)
// Look at what subjectIds the CO students were giving feedback for  
const students = await db.collection('users').find({ role: 'STUDENT' }, {
  projection: { _id: 1, departmentId: 1, academicYearId: 1 }
}).toArray();
const studentMap = new Map(students.map(s => [String(s._id), s]));

// For the first few orphaned IDs, show student list with years
const coStudentIds = new Set(
  allFeedback
    .filter(f => {
      const s = studentMap.get(String(f.studentId));
      return s?.departmentId && String(s.departmentId) === String(coDept?._id);
    })
    .map(f => String(f.studentId))
);
console.log(`\nUnique CO students who submitted feedback (all time): ${coStudentIds.size}`);

// What are the distinct orphaned subjectIds that we can infer?
// All orphaned feedback for the SAME orphaned assignmentId came from students in the same year.
// Cross-ref: find subjects that CO students in year 6906ec98b1773184f4f56bb3 should be studying
const coOddSubjects = await db.collection('subjects').find({
  $or: [
    { 'departments.id': String(coDept?._id) },
    { departmentIds: coDept?._id }
  ],
  semester: { $in: [1, 3, 5, 7, '1', '3', '5', '7'] }
}).toArray();
console.log(`\nCO Odd semester subjects: ${coOddSubjects.length}`);
coOddSubjects.forEach(s => console.log(`  ${s._id}  name=${s.name}  sem=${s.semester}`));

await client.close();
console.log('\nDone.');
