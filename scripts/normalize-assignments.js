#!/usr/bin/env node
/**
 * Normalize facultyAssignments: convert subjectId and staffId fields to strings when stored as ObjectId.
 * Optionally deduplicate assignments (keep earliest createdAt by default).
 *
 * Usage:
 *   node scripts/normalize-assignments.js         # runs normalization only
 *   node scripts/normalize-assignments.js --dedupe # normalize + dedupe duplicates
 *
 * Requires MONGODB_URI env var
 */

const { MongoClient, ObjectId } = require('mongodb');
const argv = require('minimist')(process.argv.slice(2));

const uri = 'mongodb+srv://swapnilsonawane:swapnil@cluster0.wqnku0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
if (!uri) {
  console.error('Please set MONGODB_URI in env');
  process.exit(1);
}

const DO_DEDUPE = !!argv.dedupe;
const DRY_RUN = !!argv['dry-run'] || !!argv.dry;

async function main() {
  const client = new MongoClient(uri, { useUnifiedTopology: true });
  await client.connect();
  const db = client.db('feedbackPortal');

  const coll = db.collection('facultyAssignments');
  const cursor = coll.find({});

  console.log('Normalizing facultyAssignments.subjectId and staffId to strings...');
  let updated = 0;
  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    const updates = {};
    if (doc.subjectId && typeof doc.subjectId !== 'string') {
      try { updates.subjectId = doc.subjectId.toString(); } catch (e) {}
    }
    if (doc.staffId && typeof doc.staffId !== 'string') {
      try { updates.staffId = doc.staffId.toString(); } catch (e) {}
    }
    if (Object.keys(updates).length > 0) {
      if (DRY_RUN) {
        console.log(`[dry-run] would update ${doc._id.toString()} with:`, updates);
      } else {
        await coll.updateOne({ _id: doc._id }, { $set: updates });
        updated++;
      }
    }
  }

  console.log('Normalization complete. Documents updated:', updated);

  if (DO_DEDUPE) {
    console.log('Running dedupe: grouping by subjectId::staffId::semester');
    // Re-fetch all assignments after normalization
    const all = await coll.find({}).toArray();
    const groups = {};
    for (const a of all) {
      const key = `${a.subjectId || ''}::${a.staffId || ''}::${a.semester || ''}`;
      groups[key] = groups[key] || [];
      groups[key].push(a);
    }

    let removed = 0;
    for (const [k, list] of Object.entries(groups)) {
      if (list.length <= 1) continue;
      // choose keeper: earliest createdAt if present else first
      list.sort((x, y) => {
        const tx = x.createdAt ? new Date(x.createdAt).getTime() : 0;
        const ty = y.createdAt ? new Date(y.createdAt).getTime() : 0;
        return tx - ty;
      });
      const keeper = list[0];
      const duplicates = list.slice(1);
      const idsToDelete = duplicates.map(d => d._id);
      if (DRY_RUN) {
        console.log(`[dry-run] would remove ${idsToDelete.length} duplicate(s) for ${k}, keep ${keeper._id}`);
        removed += idsToDelete.length;
      } else {
        const res = await coll.deleteMany({ _id: { $in: idsToDelete } });
        removed += res.deletedCount || 0;
        if (res.deletedCount) console.log(`Removed ${res.deletedCount} duplicate(s) for ${k}, kept ${keeper._id}`);
      }
    }
    console.log('Dedupe complete. Removed documents:', removed);
  }

  await client.close();
}

main().catch(err => { console.error(err); process.exit(1); });
