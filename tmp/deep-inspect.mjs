/**
 * deep-inspect.mjs — READ ONLY, no writes
 *
 * Deeply inspects orphaned assignmentIds to understand exactly what
 * subjects/staff/departments they were for, by cross-referencing:
 *  - The feedback records themselves (studentId → student → dept/year)
 *  - The current facultyAssignments (same dept+semester+subjectId)
 *  - The subjects collection
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

// All feedback
const allFeedback = await db.collection('feedback').find({}).toArray();

// Current assignments
const currentAssignments = await db.collection('facultyAssignments').find({}).toArray();
const existingIds = new Set(currentAssignments.map(a => String(a._id)));

// Students
const students = await db.collection('users').find({ role: 'STUDENT' }, {
  projection: { _id: 1, departmentId: 1, academicYearId: 1, name: 1, email: 1 }
}).toArray();
const studentMap = new Map(students.map(s => [String(s._id), s]));

// Subjects
const subjects = await db.collection('subjects').find({}).toArray();
const subjectMap = new Map(subjects.map(s => [String(s._id), s]));

// Staff + users
const staffList = await db.collection('staff').find({}).toArray();
const staffUserIds = staffList.map(s => new ObjectId(String(s.userId)));
const staffUsers = await db.collection('users').find({ _id: { $in: staffUserIds } }, {
  projection: { _id: 1, name: 1, email: 1 }
}).toArray();
const staffUserMap = new Map(staffUsers.map(u => [String(u._id), u]));
const staffMap = new Map(staffList.map(s => [String(s._id), { ...s, user: staffUserMap.get(String(s.userId)) }]));

// Orphaned IDs
const orphanedAids = [...new Set(
  allFeedback.filter(f => f.assignmentId && !existingIds.has(String(f.assignmentId)))
             .map(f => String(f.assignmentId))
)];

console.log(`Total orphaned assignmentIds: ${orphanedAids.length}\n`);

// For each current assignment, build lookup: subjectId+staffId+semester+deptId → assignment
const currentAssignKeyMap = new Map();
for (const a of currentAssignments) {
  const key = `${a.subjectId}::${a.staffId}::${a.semester}::${a.departmentId}`;
  currentAssignKeyMap.set(key, a);
}

// Departments
const departments = await db.collection('departments').find({}).toArray();
const deptMap = new Map(departments.map(d => [String(d._id), d]));

// For each orphaned assignmentId, find the student dept/year from feedback
for (const orphanId of orphanedAids.slice(0, 5)) { // first 5 for analysis
  const fbs = allFeedback.filter(f => String(f.assignmentId) === orphanId);
  
  // Get the unique student departmentIds + academicYearIds from this batch of feedback
  const deptIds = [...new Set(fbs.map(f => {
    const s = studentMap.get(String(f.studentId));
    return s?.departmentId ? String(s.departmentId) : null;
  }).filter(Boolean))];
  const yearIds = [...new Set(fbs.map(f => {
    const s = studentMap.get(String(f.studentId));
    return s?.academicYearId ? String(s.academicYearId) : null;
  }).filter(Boolean))];

  const orphanTimestamp = new ObjectId(orphanId).getTimestamp();

  console.log(`\nOrphan ID : ${orphanId}`);
  console.log(`  Created : ${orphanTimestamp.toISOString()}`);
  console.log(`  Feedbacks: ${fbs.length}`);
  console.log(`  Student departments: ${deptIds.map(id => deptMap.get(id)?.abbreviation || id).join(', ')}`);
  console.log(`  Student academic years: ${yearIds.join(', ')}`);

  // Which current assignment for the same dept/year shares exactly the same set of students?
  // Look for a current assignment where feedback studentIds overlap with this orphan's studentIds
  const orphanStudentIds = new Set(fbs.map(f => String(f.studentId)));
  
  let bestMatch = null;
  let bestOverlap = 0;
  for (const ca of currentAssignments) {
    const caFbs = allFeedback.filter(f => String(f.assignmentId) === String(ca._id));
    if (caFbs.length === 0) continue;
    const caStudents = new Set(caFbs.map(f => String(f.studentId)));
    const overlap = [...orphanStudentIds].filter(id => caStudents.has(id)).length;
    if (overlap > bestOverlap) { bestOverlap = overlap; bestMatch = ca; }
  }

  if (bestMatch) {
    const subj = subjectMap.get(String(bestMatch.subjectId));
    const staff = staffMap.get(String(bestMatch.staffId));
    console.log(`  Best matching current assignment:`);
    console.log(`    Assignment ID  : ${bestMatch._id}`);
    console.log(`    Subject        : ${subj?.name || bestMatch.subjectId}`);
    console.log(`    Staff          : ${staff?.user?.name || bestMatch.staffId}`);
    console.log(`    Semester       : ${bestMatch.semester}`);
    console.log(`    Student overlap: ${bestOverlap}/${orphanStudentIds.size}`);
  } else {
    console.log(`  ⚠️  No student-overlap match found in current assignments`);
  }
}

console.log('\n\n─── Current assignments summary ───');
for (const ca of currentAssignments.slice(0,10)) {
  const subj = subjectMap.get(String(ca.subjectId));
  const staff = staffMap.get(String(ca.staffId));
  const dept = deptMap.get(String(ca.departmentId));
  const caFbs = allFeedback.filter(f => String(f.assignmentId) === String(ca._id));
  console.log(`  ${ca._id}  subj=${subj?.name?.substring(0,25) || ca.subjectId}  staff=${staff?.user?.name || ca.staffId}  dept=${dept?.abbreviation || ca.departmentId}  sem=${ca.semester}  feedback=${caFbs.length}`);
}

await client.close();
console.log('\nDone.');
