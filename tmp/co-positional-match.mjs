/**
 * co-positional-match.mjs
 *
 * Matches 25 orphaned CO Odd 2025-26 assignments to current CO assignments
 * using POSITIONAL ordering within each academic year group.
 *
 * Logic:
 *   - Sort orphaned IDs by ObjectId hex (= creation timestamp order)
 *   - Sort current CO odd-sem assignments by ObjectId hex per year group
 *   - Match position-to-position: orphaned[i] → current[i]
 *
 * Usage: node tmp/co-positional-match.mjs [--dry-run]
 */
import { MongoClient, ObjectId } from 'mongodb';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '..', '.env') });

const dryRun = process.argv.includes('--dry-run');
console.log(dryRun ? '🔍 DRY RUN — nothing will be written\n' : '🔧 LIVE mode — writing to DB\n');

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const db = client.db('FeedbackPortal2');

const CO_DEPT_ID = '6906ec26b1773184f4f56bad';
const SEMESTER   = 'Odd 2025-26';

// ── Step 1: Get all 25 CO orphaned assignment IDs ───────────────────────────

const allAssigns = await db.collection('facultyAssignments').find({}, { projection: { _id: 1 } }).toArray();
const existingIds = new Set(allAssigns.map(a => String(a._id)));

// Group feedback by assignmentId, collect studentIds and academicYearIds
const feedbackGroups = await db.collection('feedback').aggregate([
  { $group: {
    _id: '$assignmentId',
    count: { $sum: 1 },
    students: { $addToSet: '$studentId' }
  }}
]).toArray();

const allStudents = await db.collection('users').find({ role: 'STUDENT' }, {
  projection: { _id: 1, departmentId: 1, academicYearId: 1, name: 1 }
}).toArray();
const studentMap = new Map(allStudents.map(s => [String(s._id), s]));

// Filter to CO orphaned assignments only
const coOrphans = feedbackGroups
  .filter(g => !existingIds.has(g._id))
  .filter(g => {
    // Determine department via students
    const voteDept = {};
    for (const sid of g.students) {
      const s = studentMap.get(String(sid));
      if (s?.departmentId) {
        const d = String(s.departmentId);
        voteDept[d] = (voteDept[d] || 0) + 1;
      }
    }
    const topDept = Object.entries(voteDept).sort((a,b) => b[1]-a[1])[0]?.[0];
    return topDept === CO_DEPT_ID;
  });

console.log(`CO orphaned assignments: ${coOrphans.length}\n`);

// ── Step 2: Determine year group for each orphaned assignment ───────────────

const allAcadYears = await db.collection('academicYears').find({}).toArray();
const yearMap = new Map(allAcadYears.map(y => [String(y._id), y]));

const orphansByYear = {}; // yearId → array of orphan entries

for (const orphan of coOrphans) {
  // Determine academicYearId from student majority
  const voteYear = {};
  for (const sid of orphan.students) {
    const s = studentMap.get(String(sid));
    if (s?.academicYearId) {
      const y = String(s.academicYearId);
      voteYear[y] = (voteYear[y] || 0) + 1;
    }
  }
  const topYear = Object.entries(voteYear).sort((a,b) => b[1]-a[1])[0]?.[0];
  orphan._yearId = topYear || 'unknown';
  
  if (!orphansByYear[topYear]) orphansByYear[topYear] = [];
  orphansByYear[topYear].push(orphan);
}

// Sort each year group by ObjectId hex (original creation order)
for (const yearId of Object.keys(orphansByYear)) {
  orphansByYear[yearId].sort((a, b) => a._id.localeCompare(b._id));
}

// ── Step 3: Get current CO odd-sem assignments, grouped by year ─────────────

const subjects = await db.collection('subjects').find({ departmentId: CO_DEPT_ID }).toArray();
const subjectMap = new Map(subjects.map(s => [String(s._id), s]));

// Identify CO odd-sem subjects
const oddSemSubjectIds = new Set(
  subjects
    .filter(s => {
      const sem = Number(s.semester);
      return !isNaN(sem) && sem % 2 === 1;
    })
    .map(s => String(s._id))
);

const allCurrentCO = await db.collection('facultyAssignments')
  .find({ departmentId: CO_DEPT_ID, semester: SEMESTER })
  .toArray();

console.log(`Current CO assignments for ${SEMESTER}: ${allCurrentCO.length}`);
const coOddSemCurrent = allCurrentCO.filter(a => oddSemSubjectIds.has(String(a.subjectId)));
console.log(`Of which odd-sem: ${coOddSemCurrent.length}\n`);

// Group current odd-sem assignments by academicYearId, sorted by ObjectId
const currentByYear = {};
for (const a of coOddSemCurrent) {
  const yearId = String(a.academicYearId || 'unknown');
  if (!currentByYear[yearId]) currentByYear[yearId] = [];
  currentByYear[yearId].push(a);
}
for (const yearId of Object.keys(currentByYear)) {
  currentByYear[yearId].sort((a, b) => String(a._id).localeCompare(String(b._id)));
}

// ── Step 4: Load staff names ────────────────────────────────────────────────

const allStaff = await db.collection('staff').find({}).toArray();
const staffMap = new Map(allStaff.map(s => [String(s._id), s]));

// ── Step 5: Build positional mapping & show ─────────────────────────────────

console.log('═══════════════════════════════════════════════════════════════');
console.log('PROPOSED POSITIONAL MAPPING (orphaned → restored doc)');
console.log('═══════════════════════════════════════════════════════════════\n');

const mappings = []; // { orphanId, staffId, subjectId, academicYearId, yearLabel }

for (const yearId of Object.keys(orphansByYear).sort()) {
  const orphanGroup = orphansByYear[yearId];
  const currentGroup = currentByYear[yearId] || [];
  const yearLabel = yearMap.get(yearId)?.name || yearMap.get(yearId)?.year || yearId;

  console.log(`Year: ${yearLabel} (${yearId})`);
  console.log(`  Orphaned assignments: ${orphanGroup.length}`);
  console.log(`  Matching current odd-sem assignments: ${currentGroup.length}`);

  if (orphanGroup.length !== currentGroup.length) {
    console.log(`  ⚠️  COUNT MISMATCH — cannot do reliable positional matching for this year group`);
    console.log(`  → Will attempt best-effort match (first ${Math.min(orphanGroup.length, currentGroup.length)} only)\n`);
  }

  const matchCount = Math.min(orphanGroup.length, currentGroup.length);
  for (let i = 0; i < matchCount; i++) {
    const orphan  = orphanGroup[i];
    const current = currentGroup[i];
    const subj    = subjectMap.get(String(current.subjectId));
    const staff   = staffMap.get(String(current.staffId));

    console.log(`  [${i+1}] Orphan ${orphan._id} (${orphan.count} feedbacks)`);
    console.log(`      → Staff  : ${staff?.name || 'unknown'}`);
    console.log(`      → Subject: ${subj?.name || 'unknown'} (sem ${subj?.semester || '?'})`);
    console.log(`      → Current: ${current._id}`);

    mappings.push({
      orphanId: orphan._id,
      staffId: String(current.staffId),
      subjectId: String(current.subjectId),
      academicYearId: String(current.academicYearId),
      feedbackCount: orphan.count,
    });
  }

  // Unmatched orphans
  if (orphanGroup.length > currentGroup.length) {
    for (let i = matchCount; i < orphanGroup.length; i++) {
      const orphan = orphanGroup[i];
      console.log(`  [${i+1}] Orphan ${orphan._id} (${orphan.count} feedbacks) — ⚠️ NO MATCH FOUND`);
    }
  }
  console.log();
}

// ── Step 6: Insert (if not dry-run) ────────────────────────────────────────

console.log('═══════════════════════════════════════════════════════════════');
console.log(`Total mappings resolved: ${mappings.length} / ${coOrphans.length}`);
console.log('═══════════════════════════════════════════════════════════════\n');

let inserted = 0, skipped = 0, failed = 0;

for (const m of mappings) {
  // Don't insert if already exists (safety check)
  if (existingIds.has(m.orphanId)) {
    console.log(`  SKIP ${m.orphanId} — already exists in DB`);
    skipped++;
    continue;
  }

  const hex = m.orphanId.substring(0, 8);
  const createdAt = new Date(parseInt(hex, 16) * 1000);

  const doc = {
    _id: new ObjectId(m.orphanId),
    staffId: m.staffId,
    subjectId: m.subjectId,
    academicYearId: m.academicYearId,
    departmentId: CO_DEPT_ID,
    semester: SEMESTER,
    restored: true,
    restoredAt: new Date(),
    createdAt,
    updatedAt: new Date(),
  };

  if (dryRun) {
    const subj = subjectMap.get(m.subjectId);
    const staff = staffMap.get(m.staffId);
    console.log(`  [DRY RUN] Would insert: ${m.orphanId} → ${staff?.name} / ${subj?.name} (${m.feedbackCount} feedbacks)`);
    inserted++;
  } else {
    try {
      await db.collection('facultyAssignments').insertOne(doc);
      const subj = subjectMap.get(m.subjectId);
      const staff = staffMap.get(m.staffId);
      console.log(`  ✅ Inserted ${m.orphanId} → ${staff?.name} / ${subj?.name} (${m.feedbackCount} feedbacks)`);
      inserted++;
    } catch (err) {
      if (err.code === 11000) {
        console.log(`  SKIP ${m.orphanId} — duplicate key`);
        skipped++;
      } else {
        console.error(`  ❌ FAIL ${m.orphanId}: ${err.message}`);
        failed++;
      }
    }
  }
}

console.log(`\n════════════════════`);
console.log(`Result: inserted=${inserted}  skipped=${skipped}  failed=${failed}`);
console.log('Done.');

await client.close();
