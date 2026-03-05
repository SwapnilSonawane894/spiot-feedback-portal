/**
 * restore-co-from-mapping.mjs
 *
 * Inserts 25 missing CO facultyAssignment documents using the exact mapping
 * derived from the database dump (tmp/co-mapping.json).
 *
 * ADDITIVE ONLY — nothing is deleted.
 *
 * Usage:  node tmp/restore-co-from-mapping.mjs [--dry-run]
 */
import { MongoClient, ObjectId } from 'mongodb';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '..', '.env') });

const dryRun = process.argv.includes('--dry-run');
console.log(dryRun ? '🔍 DRY RUN — nothing will be written\n' : '🔧 LIVE — inserting documents into DB\n');

const mappings = JSON.parse(readFileSync(resolve(__dirname, 'co-mapping.json'), 'utf8'));
console.log(`Mappings loaded: ${mappings.length}\n`);

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const db = client.db('FeedbackPortal2');

const CO_DEPT_ID = '6906ec26b1773184f4f56bad';
const SEMESTER   = 'Odd 2025-26';

// Load subject and staff names for display
const subjects  = await db.collection('subjects').find({}).toArray();
const staffList = await db.collection('staff').find({}).toArray();
const subjMap   = new Map(subjects.map(s  => [String(s._id), s.name]));
const staffMap2 = new Map(staffList.map(s => [String(s._id), s.name]));

// Get existing IDs to avoid duplicate inserts
const existingAssigns = await db.collection('facultyAssignments').find({}, { projection: { _id: 1 } }).toArray();
const existingIds = new Set(existingAssigns.map(a => String(a._id)));

let inserted = 0, skipped = 0, failed = 0;

for (const m of mappings) {
  const subjName  = subjMap.get(m.subjectId)  || m.subjectId;
  const staffName = staffMap2.get(m.staffId) || m.staffId;

  if (existingIds.has(m.orphanId)) {
    console.log(`SKIP ${m.orphanId} — already exists`);
    skipped++;
    continue;
  }

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
    console.log(`[DRY RUN] Would insert ${m.orphanId}`);
    console.log(`  Staff  : ${staffName}`);
    console.log(`  Subject: ${subjName}`);
    console.log(`  Feedbacks: ${m.fbCount}`);
    inserted++;
  } else {
    try {
      await db.collection('facultyAssignments').insertOne(doc);
      console.log(`✅ ${m.orphanId}  →  ${staffName} / ${subjName}  (${m.fbCount} feedbacks)`);
      inserted++;
    } catch (err) {
      if (err.code === 11000) {
        console.log(`SKIP ${m.orphanId} — duplicate`);
        skipped++;
      } else {
        console.error(`❌ FAIL ${m.orphanId}: ${err.message}`);
        failed++;
      }
    }
  }
}

console.log(`\n${'═'.repeat(50)}`);
console.log(`inserted=${inserted}  skipped=${skipped}  failed=${failed}`);
console.log(`Total feedback records now linked: ${mappings.filter((_,i) => i < inserted).reduce((s,m) => s+m.fbCount, 0)}`);
console.log('Done.');

await client.close();
