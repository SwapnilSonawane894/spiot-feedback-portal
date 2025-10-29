#!/usr/bin/env node
const { MongoClient, ObjectId } = require('mongodb');

function asString(v) {
  if (v === undefined || v === null) return null;
  if (typeof v === 'string') return v;
  if (v instanceof ObjectId) return v.toString();
  try { return String(v); } catch (e) { return null; }
}

async function findSubject(db, subjectId) {
  if (!subjectId) return null;
  const sid = asString(subjectId);
  const or = [];
  if (/^[0-9a-fA-F]{24}$/.test(sid)) {
    try { or.push({ _id: new ObjectId(sid) }); } catch (e) {}
  }
  or.push({ _id: sid });
  or.push({ id: sid });
  return await db.collection('subjects').findOne(or.length === 1 ? or[0] : { $or: or });
}

async function run() {
  const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URL;
  const DB_NAME = process.env.DB_NAME || process.env.MONGO_DB || 'feedbackPortal';
  const DRY = process.argv.includes('--dry-run');
  if (!MONGO_URI) {
    console.error('MONGODB_URI required in env');
    process.exit(1);
  }

  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db(DB_NAME);

  try {
    console.log('Scanning facultyAssignments to determine desired academicYearId... (dry-run=' + DRY + ')');

    const cursor = db.collection('facultyAssignments').find({});
    let total = 0;
    let toUpdate = [];

    while (await cursor.hasNext()) {
      const a = await cursor.next();
      total++;
      const currentAY = asString(a.academicYearId);

      // Try to find junction row first (departmentSubjects)
      const deptId = asString(a.departmentId);
      const subjId = asString(a.subjectId);

      let desiredAY = null;
      if (deptId && subjId) {
        const junction = await db.collection('departmentSubjects').findOne({ departmentId: deptId, subjectId: subjId });
        if (junction && junction.academicYearId) desiredAY = asString(junction.academicYearId);
      }

      // fallback to master subject's academicYearId
      if (!desiredAY) {
        const subj = await findSubject(db, subjId);
        if (subj && subj.academicYearId) desiredAY = asString(subj.academicYearId);
      }

      // If we found a desiredAY and it differs from current, schedule update
      if (desiredAY && desiredAY !== currentAY) {
        toUpdate.push({ _id: a._id, currentAY, desiredAY });
      }
    }

    console.log(`Scanned ${total} assignments. Found ${toUpdate.length} that need academicYearId updates.`);
    if (toUpdate.length > 0) console.log('Sample:', toUpdate.slice(0, 5));

    if (!DRY && toUpdate.length > 0) {
      const bulk = db.collection('facultyAssignments').initializeUnorderedBulkOp();
      for (const u of toUpdate) {
        bulk.find({ _id: u._id }).updateOne({ $set: { academicYearId: u.desiredAY, updatedAt: new Date() } });
      }
      const res = await bulk.execute();
      console.log('Bulk update result:', res.toJSON ? res.toJSON() : res);
    } else if (DRY) {
      console.log('Dry run - no updates applied. Re-run without --dry-run to apply changes.');
    }

    await client.close();
    console.log('Done.');
    process.exit(0);
  } catch (err) {
    console.error('Error during backfill:', err);
    await client.close();
    process.exit(1);
  }
}

run();
