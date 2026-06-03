/**
 * Direct insert — bypasses existingIds pre-check, relies solely on MongoDB's
 * duplicate key error (code 11000) to handle true duplicates safely.
 */
import { MongoClient, ObjectId } from 'mongodb';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '..', '.env') });

const dryRun = process.argv.includes('--dry-run');
console.log(dryRun ? '🔍 DRY RUN — nothing will be written\n' : '🔧 LIVE — inserting into DB\n');

const mappings = JSON.parse(readFileSync(resolve(__dirname, 'co-mapping.json'), 'utf8'));
console.log(`Mappings to insert: ${mappings.length}\n`);

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const db = client.db('FeedbackPortal2');

const CO_DEPT_ID = '6906ec26b1773184f4f56bad';
const SEMESTER   = 'Odd 2025-26';

const subjects  = await db.collection('subjects').find({}).toArray();
const staffList = await db.collection('staff').find({}).toArray();
const subjMap   = new Map(subjects.map(s  => [String(s._id), s.name]));
const staffMap2 = new Map(staffList.map(s => [String(s._id), s.name]));

let inserted = 0, skipped = 0, failed = 0;

for (const m of mappings) {
  const subjName  = subjMap.get(m.subjectId)  || `subj:${m.subjectId}`;
  const staffName = staffMap2.get(m.staffId) || `staff:${m.staffId}`;
  const hex = m.orphanId.substring(0, 8);
  const createdAt = new Date(parseInt(hex, 16) * 1000);

  const doc = {
    _id:            new ObjectId(m.orphanId),
    staffId:        m.staffId,
    subjectId:      m.subjectId,
    academicYearId: m.academicYearId,
    departmentId:   CO_DEPT_ID,
    semester:       SEMESTER,
    restored:       true,
    restoredAt:     new Date(),
    createdAt,
    updatedAt:      new Date(),
  };

  if (dryRun) {
    console.log(`[DRY RUN] ${m.orphanId}  →  ${staffName} / ${subjName}  (${m.fbCount} fbs)`);
    inserted++;
    continue;
  }

  try {
    await db.collection('facultyAssignments').insertOne(doc);
    console.log(`✅ ${m.orphanId}  →  ${staffName} / ${subjName}  (${m.fbCount} fbs)`);
    inserted++;
  } catch (err) {
    if (err.code === 11000) {
      console.log(`⚠️  SKIP ${m.orphanId} — already in DB (duplicate key)`);
      skipped++;
    } else {
      console.error(`❌ FAIL ${m.orphanId}: ${err.message}`);
      failed++;
    }
  }
}

console.log(`\n${'═'.repeat(55)}`);
console.log(`inserted=${inserted}  skipped=${skipped}  failed=${failed}`);

if (!dryRun && inserted > 0) {
  // Quick verification
  const totalAssigns = await db.collection('facultyAssignments').countDocuments();
  const allAssignIds = (await db.collection('facultyAssignments').find({}, { projection: { _id: 1 } }).toArray()).map(a => String(a._id));
  const assignIdSet = new Set(allAssignIds);
  const totalFb = await db.collection('feedback').countDocuments();
  const orphanedFb = await db.collection('feedback').aggregate([
    { $group: { _id: '$assignmentId' } }
  ]).toArray();
  const stillOrphaned = orphanedFb.filter(g => !assignIdSet.has(g._id)).length;

  console.log(`\nPost-insert verification:`);
  console.log(`  Total assignments : ${totalAssigns}`);
  console.log(`  Total feedback    : ${totalFb}`);
  console.log(`  Orphaned assign IDs still: ${stillOrphaned}`);
}

console.log('Done.');
await client.close();
