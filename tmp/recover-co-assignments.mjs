/**
 * recover-co-assignments.mjs
 *
 * Precisely recovers the 38 orphaned facultyAssignment documents for CO dept.
 *
 * Method:
 *   For each orphaned assignmentId:
 *   1. Sample the feedback records → get student academicYearId
 *   2. Find the current CO assignment (69a00f09...) that:
 *      - has the same departmentId (CO)
 *      - same semester (Odd 2025-26)
 *      - same academicYearId (from subjects)
 *      - AND has the SAME set of students in its own feedback (if any)
 *      - OR simply: for orphaned IDs that have no current counterpart with feedback,
 *        match by subjectId sequence (IDs were created in the same batch order)
 *   3. Insert the orphaned _id pointing to the correct staffId+subjectId+departmentId
 *
 * Usage:  node tmp/recover-co-assignments.mjs [--dry-run]
 */

import { MongoClient, ObjectId } from 'mongodb';
import { config } from 'dotenv';
import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '..', '.env') });

const dryRun = process.argv.includes('--dry-run');
console.log(dryRun ? '🔍 DRY RUN — nothing will be written\n' : '🔧 LIVE mode — writing to DB\n');

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const db = client.db('FeedbackPortal2');

// ── Load data ────────────────────────────────────────────────────────────────

const CO_DEPT_ID   = '6906ec26b1773184f4f56bad';
const SEMESTER     = 'Odd 2025-26';

const allFeedback      = await db.collection('feedback').find({}).toArray();
const currentAssigns   = await db.collection('facultyAssignments').find({}).toArray();
const existingIds      = new Set(currentAssigns.map(a => String(a._id)));
const subjects         = await db.collection('subjects').find({}).toArray();
const subjectMap       = new Map(subjects.map(s => [String(s._id), s]));
const students         = await db.collection('users').find({ role: 'STUDENT' }, {
  projection: { _id: 1, departmentId: 1, academicYearId: 1 }
}).toArray();
const studentMap       = new Map(students.map(s => [String(s._id), s]));
const staffDocs        = await db.collection('staff').find({}).toArray();
const staffUserDocs    = await db.collection('users').find({ role: { $in: ['STAFF','HOD'] } }, {
  projection: { _id: 1, name: 1 }
}).toArray();
const staffUserNameMap = new Map(staffUserDocs.map(u => [String(u._id), u.name]));
const staffNameMap     = new Map(staffDocs.map(s => [String(s._id),
  staffUserNameMap.get(String(s.userId)) || String(s._id)]));

// ── Find orphaned IDs ──────────────────────────────────────────────────────────

const orphanedAids = [...new Set(
  allFeedback.filter(f => f.assignmentId && !existingIds.has(String(f.assignmentId)))
             .map(f => String(f.assignmentId))
)];
console.log(`Orphaned assignmentIds: ${orphanedAids.length}\n`);

// Current CO assignments (the NEW ones created after the re-save)
const coCurrentAssigns = currentAssigns.filter(a => String(a.departmentId) === CO_DEPT_ID && a.semester === SEMESTER);
console.log(`Current CO assignments for ${SEMESTER}: ${coCurrentAssigns.length}\n`);

// For each current CO assignment, compute the set of students who gave feedback
const coCurrentAssignStudentSets = new Map(); // assignId → Set<studentId>
for (const ca of coCurrentAssigns) {
  const fbs = allFeedback.filter(f => String(f.assignmentId) === String(ca._id));
  coCurrentAssignStudentSets.set(String(ca._id), new Set(fbs.map(f => String(f.studentId))));
}

// ── Match each orphaned ID to its correct current assignment ────────────────────
// Strategy:
//   For each orphaned assignment:
//     1. Get the set of studentIds who gave feedback through this orphaned ID
//     2. Find the current CO assignment whose OWN student-feedback set has the
//        MOST overlap — they share the same students → same subjectId+staffId
//     3. If no current assignment has feedback overlap (new assignments with 0 feedback),
//        fall back to matching by academicYearId of the subject

let inserted = 0, skipped = 0, failed = 0;

for (const orphanId of orphanedAids) {
  if (existingIds.has(orphanId)) { skipped++; continue; }

  const fbs = allFeedback.filter(f => String(f.assignmentId) === orphanId);
  if (fbs.length === 0) { skipped++; continue; }

  // Get orphan's student set
  const orphanStudents = new Set(fbs.map(f => String(f.studentId)));

  // Get acad year from students
  const yearIds = [...new Set(fbs.map(f => {
    const s = studentMap.get(String(f.studentId));
    return s?.academicYearId ? String(s.academicYearId) : null;
  }).filter(Boolean))];

  // --- Attempt 1: overlap with current assignment's own feedback students ---
  let bestMatch = null;
  let bestOverlap = 0;

  for (const ca of coCurrentAssigns) {
    const caStudents = coCurrentAssignStudentSets.get(String(ca._id));
    if (!caStudents || caStudents.size === 0) continue;
    const overlap = [...orphanStudents].filter(id => caStudents.has(id)).length;
    if (overlap > bestOverlap) {
      bestOverlap = overlap;
      bestMatch = ca;
    }
  }

  // --- Attempt 2: match by subject's academicYearId + dept ─────────────────────────────
  if (!bestMatch || bestOverlap === 0) {
    // Find CO assignments whose subject matches the year and dept
    for (const ca of coCurrentAssigns) {
      const subj = subjectMap.get(String(ca.subjectId));
      if (!subj) continue;
      const subjYear = subj.academicYearId ? String(subj.academicYearId) : null;
      if (yearIds.includes(subjYear)) {
        bestMatch = ca;
        break;
      }
    }
  }

  const orphanTime = new ObjectId(orphanId).getTimestamp();
  const subjId  = bestMatch?.subjectId  ? String(bestMatch.subjectId)  : 'unknown';
  const staffId = bestMatch?.staffId    ? String(bestMatch.staffId)    : 'unknown';
  const acYrId  = bestMatch?.academicYearId ? String(bestMatch.academicYearId) : (yearIds[0] || null);
  const subj    = subjectMap.get(subjId);
  const staffName = staffNameMap.get(staffId) || staffId;

  console.log(`Orphan ${orphanId}  (${fbs.length} feedbacks, overlap=${bestOverlap})`);
  console.log(`  → subject  : ${subj?.name || subjId}  (sem ${subj?.semester})`);
  console.log(`  → staff    : ${staffName}`);
  console.log(`  → year     : ${acYrId}`);

  const doc = {
    _id: new ObjectId(orphanId),
    staffId,
    subjectId: subjId,
    semester:  SEMESTER,
    departmentId: CO_DEPT_ID,
    academicYearId: acYrId,
    restored: true,
    restoredAt: new Date(),
    createdAt: orphanTime,
    updatedAt: new Date(),
  };

  if (dryRun) {
    console.log(`  [DRY RUN] Would insert assignment doc`);
    inserted++;
  } else {
    try {
      await db.collection('facultyAssignments').insertOne(doc);
      console.log(`  ✅ Inserted`);
      existingIds.add(orphanId); // track to avoid double-insert attempt
      inserted++;
    } catch (err) {
      if (err.code === 11000) { console.log(`  ⏭  Already exists`); skipped++; }
      else { console.error(`  ❌ ${err.message}`); failed++; }
    }
  }
  console.log('');
}

console.log('═'.repeat(60));
console.log(`Result: inserted=${inserted}  skipped=${skipped}  failed=${failed}`);

if (!dryRun) {
  // Verify
  const allFb2 = await db.collection('feedback').find({}, { projection: { assignmentId: 1 } }).toArray();
  const allAids = new Set(
    (await db.collection('facultyAssignments').find({}, { projection: { _id: 1 } }).toArray())
      .map(a => String(a._id))
  );
  const stillOrphaned = allFb2.filter(f => f.assignmentId && !allAids.has(String(f.assignmentId))).length;
  console.log(`\nOrphaned feedback remaining: ${stillOrphaned}`);
  if (stillOrphaned === 0) console.log('🎉 All feedback now linked to valid assignments!');
}

await client.close();
console.log('Done.');
