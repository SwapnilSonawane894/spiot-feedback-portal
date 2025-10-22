#!/usr/bin/env node
/*
  Migration helper for spiot-feedback-portal
  - Backs up subjects and facultyAssignments to JSON files
  - Sets missing departmentId on subjects (for a given departmentId)
  - Converts facultyAssignments.subjectId from string to ObjectId when possible
  - Usage:
      node scripts/fix-subject-dept-and-ids.js --uri="<MONGODB_URI>" --db="<DB_NAME>" --dept="68f6390b641c7bcb2781b39c" --apply --self-delete
    Flags:
      --uri     MongoDB connection string (or set MONGODB_URI env)
      --db      Database name (optional, default: feedbackPortal)
      --dept    Department id to set on subjects (required if --apply)
      --apply   Actually perform updates (without this the script only reports what it would do)
      --self-delete  Delete this script after successful run

  WARNING: This script performs destructive updates when run with --apply. It will create JSON backups first.
*/

const { MongoClient, ObjectId } = require('mongodb');
const fs = require('fs');
const path = require('path');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  args.forEach(a => {
    if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split('=');
      out[k] = v === undefined ? true : v;
    }
  });
  return out;
}

async function run() {
  const args = parseArgs();
  const uri = args.uri || process.env.MONGODB_URI;
  if (!uri) {
    console.error('Missing --uri or MONGODB_URI');
    process.exit(1);
  }
  const dbName = args.db || 'feedbackPortal';
  const deptId = args.dept || args.departmentId;
  const doApply = !!args.apply;
  const selfDelete = !!args['self-delete'] || !!args.selfDelete;

  console.log('Connecting to', uri, 'db:', dbName);
  const client = new MongoClient(uri, { useUnifiedTopology: true });
  await client.connect();
  const db = client.db(dbName);

  try {
    // Read collections
    const subjectsColl = db.collection('subjects');
    const assignmentsColl = db.collection('facultyAssignments');

    // Find subjects missing departmentId
    const missingSubjects = await subjectsColl.find({ $or: [{ departmentId: { $exists: false } }, { departmentId: null }] }).toArray();
    console.log('Subjects missing departmentId:', missingSubjects.length);

    // Backup affected documents to JSON files
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const outDir = path.join(process.cwd(), 'migration-backups');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
    const subjectsBackup = path.join(outDir, `subjects-backup-${ts}.json`);
    const assignmentsBackup = path.join(outDir, `assignments-backup-${ts}.json`);

    console.log('Writing full subjects backup to', subjectsBackup);
    const allSubjects = await subjectsColl.find({}).toArray();
    fs.writeFileSync(subjectsBackup, JSON.stringify(allSubjects, null, 2));

    console.log('Writing full assignments backup to', assignmentsBackup);
    const allAssignments = await assignmentsColl.find({}).toArray();
    fs.writeFileSync(assignmentsBackup, JSON.stringify(allAssignments, null, 2));

    // Report sample missing subjects
    if (missingSubjects.length > 0) {
      console.log('Sample missing subjects (first 10):');
      missingSubjects.slice(0, 10).forEach(s => console.log({ id: s._id ? s._id.toString() : null, name: s.name, subjectCode: s.subjectCode, academicYearId: s.academicYearId }));
    }

    // If apply flag not set, stop here after reporting
    if (!doApply) {
      console.log('\nDry run complete. To apply updates, re-run with --apply and supply --dept if needed.');
      await client.close();
      return;
    }

    if (!deptId) {
      console.error('--dept is required when running with --apply');
      await client.close();
      process.exit(1);
    }

    // Determine whether deptId should be ObjectId or string
    let deptValue = deptId;
    if (/^[0-9a-fA-F]{24}$/.test(deptId)) {
      deptValue = new ObjectId(deptId);
    }

    // Update subjects missing departmentId
    const updateResult = await subjectsColl.updateMany(
      { $or: [{ departmentId: { $exists: false } }, { departmentId: null }] },
      { $set: { departmentId: deptValue } }
    );
    console.log('Subjects updated (departmentId set):', updateResult.modifiedCount);

    // Convert assignment.subjectId strings to ObjectId when possible
    const stringAssignmentsCursor = assignmentsColl.find({ subjectId: { $type: 'string' } });
    let converted = 0;
    while (await stringAssignmentsCursor.hasNext()) {
      const doc = await stringAssignmentsCursor.next();
      const sid = doc.subjectId;
      if (typeof sid === 'string' && /^[0-9a-fA-F]{24}$/.test(sid)) {
        try {
          await assignmentsColl.updateOne({ _id: doc._id }, { $set: { subjectId: new ObjectId(sid) } });
          converted++;
        } catch (e) {
          console.warn('Failed to convert subjectId for assignment', doc._id.toString(), e.message);
        }
      }
    }
    console.log('Assignments converted (subjectId string -> ObjectId):', converted);

    console.log('Migration applied successfully. Backups are in', outDir);

    if (selfDelete) {
      const scriptPath = path.join(process.cwd(), 'scripts', 'fix-subject-dept-and-ids.js');
      try {
        await client.close();
        fs.unlinkSync(scriptPath);
        console.log('Script self-deleted:', scriptPath);
      } catch (e) {
        console.error('Self-delete failed:', e.message);
      }
    } else {
      await client.close();
    }
  } catch (err) {
    console.error('Migration failed:', err);
    try { await client.close(); } catch (_) {}
    process.exit(1);
  }
}

run().catch(err => { console.error(err); process.exit(1); });
