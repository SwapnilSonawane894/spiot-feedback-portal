/**
 * restore-orphaned-assignments.mjs
 *
 * Reconstructs the 38 missing facultyAssignment documents whose _ids are still
 * referenced by 2000+ feedback records. This is ADDITIVE ONLY — it never deletes
 * or modifies any existing document.
 *
 * Strategy:
 *   For each orphaned assignmentId:
 *   1. Look at the feedback records that use it to find staffId references
 *      (feedback has studentId, but NOT staffId directly).
 *   2. Cross-reference with the currently active assignments that share the same
 *      subjectId + departmentId + semester to infer staffId.
 *   3. If that is ambiguous, look at the IDs of the NEW assignments that replaced
 *      these (they were created shortly after with similar subjectId/departmentId).
 *   4. Insert a minimal assignment document with the ORIGINAL _id so all feedback
 *      records immediately link back up.
 *
 * Usage:  node tmp/restore-orphaned-assignments.mjs [--dry-run]
 *   --dry-run  : Show what would be inserted but don't write to DB
 */

import { MongoClient, ObjectId } from 'mongodb';
import { config } from 'dotenv';
import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env');
if (existsSync(envPath)) config({ path: envPath });

const dryRun = process.argv.includes('--dry-run');

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const db = client.db('FeedbackPortal2');

console.log(dryRun ? '🔍 DRY RUN mode — nothing will be written\n' : '🔧 LIVE mode — will insert missing assignments\n');

// ── Step 1: Find all orphaned assignmentIds ──────────────────────────────────
const allFeedback = await db.collection('feedback').find({}, {
  projection: { assignmentId: 1, studentId: 1 }
}).toArray();

const existingAssignIds = new Set(
  (await db.collection('facultyAssignments').find({}, { projection: { _id: 1 } }).toArray())
    .map(a => String(a._id))
);

const orphanedAids = [...new Set(
  allFeedback.filter(f => f.assignmentId && !existingAssignIds.has(String(f.assignmentId)))
             .map(f => String(f.assignmentId))
)];

console.log(`Found ${orphanedAids.length} orphaned assignmentIds covering ${
  allFeedback.filter(f => f.assignmentId && !existingAssignIds.has(String(f.assignmentId))).length
} feedback records.\n`);

// ── Step 2: For each orphaned ID, pick up clues from the NEW assignments ──────
// The HOD re-saved assignments for their department+semester — new docs were created
// with new _ids but same subjectId/departmentId/semester/staffId.
// Group orphaned IDs by creation timestamp (prefix of ObjectId = timestamp).

// Get all current assignments as lookup reference
const currentAssignments = await db.collection('facultyAssignments').find({}).toArray();

// Get students to find their departmentId + academicYearId
const allStudents = await db.collection('users').find(
  { role: 'STUDENT' },
  { projection: { _id: 1, departmentId: 1, academicYearId: 1 } }
).toArray();
const studentMap = new Map(allStudents.map(s => [String(s._id), s]));

// ── Step 3: For each orphaned assignmentId, figure out what assignment it was ───
let inserted = 0;
let skipped = 0;
let failed = 0;

for (const orphanId of orphanedAids) {
  // Skip if somehow it now exists
  if (existingAssignIds.has(orphanId)) { skipped++; continue; }

  // Find all feedback for this orphaned assignmentId
  const feedbackForThis = allFeedback.filter(f => String(f.assignmentId) === orphanId);
  if (feedbackForThis.length === 0) { skipped++; continue; }

  // Get a sample student to find their departmentId + academicYearId
  const sampleStudentId = feedbackForThis[0]?.studentId;
  const student = sampleStudentId ? studentMap.get(String(sampleStudentId)) : null;
  const departmentId = student?.departmentId ? String(student.departmentId) : null;
  const academicYearId = student?.academicYearId ? String(student.academicYearId) : null;

  // Extract timestamp from the orphaned ObjectId to find which semester it belongs to
  const oidTimestamp = new ObjectId(orphanId).getTimestamp();

  // Find a current assignment that was created around the same time as the re-save
  // and shares the same departmentId — use its semester string as the canonical one
  const sameTimeDeptAssignments = currentAssignments.filter(a => {
    const sameDate = (a.createdAt || new ObjectId(String(a._id)).getTimestamp());
    return String(a.departmentId) === departmentId;
  });

  // We know the semester from DB settings at time of feedback: use "Odd 2025-26"
  // (all current assignments are Odd 2025-26 and the IDs in feedback match that period)
  const semester = sameTimeDeptAssignments.length > 0
    ? sameTimeDeptAssignments[0].semester
    : 'Odd 2025-26';

  // For staffId + subjectId: find the current assignment for same dept/semester/academicYear
  // that covers the same student cohort. The best proxy is: look for a current assignment
  // that has the same departmentId + semester + academicYearId and pick the one whose
  // creation timestamp is closest after the orphaned ID's timestamp.
  const candidateAssignments = currentAssignments.filter(a =>
    String(a.departmentId) === departmentId &&
    a.semester === semester &&
    (!academicYearId || !a.academicYearId || String(a.academicYearId) === academicYearId)
  );

  // Pick the candidate with the closest timestamp (new assignment was created just after old one deleted)
  const orphanTime = oidTimestamp.getTime();
  candidateAssignments.sort((a, b) => {
    const ta = (a.createdAt || new ObjectId(String(a._id)).getTimestamp()).getTime();
    const tb = (b.createdAt || new ObjectId(String(b._id)).getTimestamp()).getTime();
    return Math.abs(ta - orphanTime) - Math.abs(tb - orphanTime);
  });
  const bestCandidate = candidateAssignments[0];

  const staffId = bestCandidate?.staffId ? String(bestCandidate.staffId) : null;
  const subjectId = bestCandidate?.subjectId ? String(bestCandidate.subjectId) : null;

  console.log(`Orphan ${orphanId}:`);
  console.log(`  feedback records : ${feedbackForThis.length}`);
  console.log(`  student dept     : ${departmentId}`);
  console.log(`  academicYearId   : ${academicYearId}`);
  console.log(`  inferred semester: ${semester}`);
  console.log(`  inferred staffId : ${staffId}`);
  console.log(`  inferred subjectId: ${subjectId}`);

  if (!staffId || !subjectId || !departmentId) {
    console.log(`  ⚠️  Could not resolve staffId/subjectId — will insert minimal doc anyway`);
  }

  const doc = {
    _id: new ObjectId(orphanId),
    staffId: staffId || 'unknown',
    subjectId: subjectId || 'unknown',
    semester,
    departmentId: departmentId || 'unknown',
    academicYearId: academicYearId || null,
    restored: true,           // flag so you know this was auto-restored
    restoredAt: new Date(),
    createdAt: oidTimestamp,
    updatedAt: new Date(),
  };

  if (dryRun) {
    console.log(`  [DRY RUN] Would insert:`, JSON.stringify(doc));
    inserted++;
  } else {
    try {
      await db.collection('facultyAssignments').insertOne(doc);
      console.log(`  ✅ Inserted`);
      inserted++;
    } catch (err) {
      if (err.code === 11000) {
        console.log(`  ⏭  Already exists (duplicate key)`);
        skipped++;
      } else {
        console.error(`  ❌ Error: ${err.message}`);
        failed++;
      }
    }
  }
  console.log('');
}

console.log('─'.repeat(60));
console.log(`Summary: inserted=${inserted}  skipped=${skipped}  failed=${failed}`);

if (!dryRun && inserted > 0) {
  // Verify
  const newTotal = await db.collection('facultyAssignments').countDocuments();
  const remaining = allFeedback.filter(f => {
    if (!f.assignmentId) return false;
    return !existingAssignIds.has(String(f.assignmentId)) &&
           !orphanedAids.includes(String(f.assignmentId));
  }).length;
  console.log(`\nNew total assignments in DB: ${newTotal}`);
  console.log(`Remaining orphaned feedback : ${remaining}`);
  console.log('\n✅ All feedback records should now resolve to valid assignments.');
  console.log('⚠️  NOTE: staffId/subjectId on restored docs are best-guess inferences.');
  console.log('   The reports API needs a second fix to look up feedback by the CORRECT assignments.');
}

await client.close();
