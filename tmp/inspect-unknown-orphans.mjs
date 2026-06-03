import { MongoClient, ObjectId } from 'mongodb';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const db = client.db('FeedbackPortal2');

const CO_DEPT_ID = '6906ec26b1773184f4f56bad';

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

console.log('=== Inspecting batch-2 unknown orphans ===\n');

// Get ALL current CO assignments
const allCurrentCO = await db.collection('facultyAssignments')
  .find({ departmentId: CO_DEPT_ID })
  .toArray();
console.log(`Current CO assignments: ${allCurrentCO.length}\n`);

// For each current assignment, get its student IDs from feedback
const currentAssignmentStudents = new Map();
for (const a of allCurrentCO) {
  const fbs = await db.collection('feedback').find({ assignmentId: String(a._id) }).toArray();
  currentAssignmentStudents.set(String(a._id), new Set(fbs.map(f => String(f.studentId))));
}

for (const orphanId of batch2) {
  const feedbacks = await db.collection('feedback').find({ assignmentId: orphanId }).toArray();
  if (feedbacks.length === 0) { console.log(`${orphanId}: no feedback`); continue; }

  const fb = feedbacks[0];
  const studentId = String(fb.studentId);
  const acYrId = String(fb.academicYearId || '');

  // Find current assignments where this student also gave feedback
  const matchingAssignments = [];
  for (const [aId, students] of currentAssignmentStudents) {
    if (students.has(studentId)) matchingAssignments.push(aId);
  }

  console.log(`Orphan ${orphanId} (acYear: ${acYrId}):`);
  console.log(`  studentId: ${studentId}`);

  if (matchingAssignments.length > 0) {
    console.log(`  MATCH — student also in these current assignments:`);
    for (const aId of matchingAssignments) {
      const a = allCurrentCO.find(x => String(x._id) === aId);
      if (!a) continue;
      let subjName = 'unknown', staffName = 'unknown';
      try { const s = await db.collection('subjects').findOne({ _id: new ObjectId(String(a.subjectId)) }); if (s) subjName = s.name; } catch {}
      try { const s = await db.collection('staff').findOne({ _id: new ObjectId(String(a.staffId)) }); if (s) staffName = s.name; } catch {}
      console.log(`    ${aId}: ${subjName} / ${staffName} (sem: ${a.semester})`);
    }
  } else {
    // Check all feedback for this student regardless of dept
    const allStudentFb = await db.collection('feedback').find({ studentId: studentId }).toArray();
    const nonOrphanFb = allStudentFb.filter(f => !batch2.includes(f.assignmentId));
    console.log(`  NO overlap. Student has ${nonOrphanFb.length} non-orphan feedback records.`);
    for (const f of nonOrphanFb.slice(0, 3)) {
      const a = await db.collection('facultyAssignments').findOne({
        _id: new ObjectId(String(f.assignmentId))
      }).catch(() => null);
      if (a) {
        let subjName = 'unknown';
        try { const s = await db.collection('subjects').findOne({ _id: new ObjectId(String(a.subjectId)) }); if (s) subjName = s.name; } catch {}
        console.log(`    assignId ${f.assignmentId}: ${subjName} / dept: ${a.departmentId}`);
      }
    }

    // Also try look up by academicYearId in current CO assignments
    const yearMatches = allCurrentCO.filter(a => String(a.academicYearId) === acYrId);
    console.log(`  CO assignments with same academicYearId: ${yearMatches.length}`);
    if (yearMatches.length > 0) {
      const a = yearMatches[0];
      let subjName = 'unknown', staffName = 'unknown';
      try { const s = await db.collection('subjects').findOne({ _id: new ObjectId(String(a.subjectId)) }); if (s) subjName = s.name; } catch {}
      try { const s = await db.collection('staff').findOne({ _id: new ObjectId(String(a.staffId)) }); if (s) staffName = s.name; } catch {}
      console.log(`  e.g. ${a._id}: ${subjName} / ${staffName}`);
    }
  }
  console.log();
}

// AcademicYear names
console.log('=== AcademicYear IDs in batch-2 ===');
const yearIds = new Set();
for (const orphanId of batch2) {
  const fb = await db.collection('feedback').findOne({ assignmentId: orphanId });
  if (fb?.academicYearId) yearIds.add(String(fb.academicYearId));
}
for (const yearId of yearIds) {
  const yr = await db.collection('academicYears').findOne({ _id: new ObjectId(yearId) }).catch(() => null);
  const count = batch2.filter(async () => true).length; // placeholder
  console.log(`  ${yearId}: ${yr?.name || yr?.year || yr?.label || JSON.stringify(yr)}`);
  // count how many orphans reference this year
  let n = 0;
  for (const orphanId of batch2) {
    const fb = await db.collection('feedback').findOne({ assignmentId: orphanId });
    if (fb?.academicYearId && String(fb.academicYearId) === yearId) n++;
  }
  console.log(`    -> ${n} orphans reference this year`);
}

await client.close();
