/**
 * fix-feedback-assignmentids.mjs
 *
 * Updates orphaned feedback records to point to the correct CURRENT assignment IDs
 * instead of the old deleted ones. Uses co-mapping.json to identify which
 * current CO assignment each orphaned feedback should link to.
 *
 * SAFE: Only updates feedback.assignmentId field. Nothing is deleted.
 *
 * Usage:  node tmp/fix-feedback-assignmentids.mjs [--dry-run]
 */
import { MongoClient } from 'mongodb';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '..', '.env') });

const dryRun = process.argv.includes('--dry-run');
console.log(dryRun ? '🔍 DRY RUN — nothing will be written\n' : '🔧 LIVE — updating feedback records\n');

const mappings = JSON.parse(readFileSync(resolve(__dirname, 'co-mapping.json'), 'utf8'));

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const db = client.db('FeedbackPortal2');

const subjects  = await db.collection('subjects').find({}).toArray();
const staffList = await db.collection('staff').find({}).toArray();
const subjMap   = new Map(subjects.map(s  => [String(s._id), s.name]));
const staffMap2 = new Map(staffList.map(s => [String(s._id), s.name]));

let totalUpdated = 0, totalFailed = 0;

console.log('Processing each orphaned assignment mapping:\n');

for (const m of mappings) {
  // Find the CURRENT assignment with the same staffId/subjectId/semester/academicYearId
  const current = await db.collection('facultyAssignments').findOne({
    staffId:        m.staffId,
    subjectId:      m.subjectId,
    semester:       'Odd 2025-26',
    academicYearId: m.academicYearId,
    departmentId:   '6906ec26b1773184f4f56bad',
  });

  const subjName  = subjMap.get(m.subjectId)  || m.subjectId;
  const staffName = staffMap2.get(m.staffId) || m.staffId;

  if (!current) {
    console.log(`❌ Cannot find current assignment for orphan ${m.orphanId}`);
    console.log(`   (${staffName} / ${subjName})`);
    totalFailed++;
    continue;
  }

  const newAssignId = String(current._id);

  if (dryRun) {
    console.log(`[DRY RUN] Orphan ${m.orphanId} (${m.fbCount} fbs)`);
    console.log(`  Staff/Subject: ${staffName} / ${subjName}`);
    console.log(`  Old ID → New ID: ${m.orphanId} → ${newAssignId}`);
  } else {
    const result = await db.collection('feedback').updateMany(
      { assignmentId: m.orphanId },
      { $set: { assignmentId: newAssignId } }
    );
    console.log(`✅ ${m.orphanId} → ${newAssignId}  (updated ${result.modifiedCount} / ${m.fbCount} feedbacks)  [${staffName} / ${subjName}]`);
    totalUpdated += result.modifiedCount;
  }
}

console.log(`\n${'═'.repeat(60)}`);
if (dryRun) {
  console.log(`Would update feedback for ${mappings.length - totalFailed} assignments`);
  console.log(`Total feedbacks to re-link: ${mappings.reduce((s,m) => s+m.fbCount, 0)}`);
} else {
  console.log(`Total feedback records updated: ${totalUpdated}`);
  console.log(`Failed: ${totalFailed}`);

  // Verify
  const allAssignIds = new Set(
    (await db.collection('facultyAssignments').find({}, { projection: { _id: 1 } }).toArray()).map(a => String(a._id))
  );
  const allFb = await db.collection('feedback').find({}, { projection: { assignmentId: 1 } }).toArray();
  const orphaned = allFb.filter(f => !allAssignIds.has(f.assignmentId));
  const orphanedUnique = [...new Set(orphaned.map(f => f.assignmentId))];
  console.log(`\nPost-update verification:`);
  console.log(`  Total feedback       : ${allFb.length}`);
  console.log(`  Still orphaned       : ${orphaned.length} (${orphanedUnique.length} unique assignment IDs)`);
  console.log(`  Now linked correctly : ${allFb.length - orphaned.length}`);
}
console.log('Done.');

await client.close();
