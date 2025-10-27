require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
if (!MONGO_URI) {
  console.error('Missing MONGO_URI or MONGODB_URI in env');
  process.exit(1);
}

const EE = '68f6390b641c7bcb2781b39d';
const TYEE = '68fc86d399ba276515402d23';
const SYEE = '68fc86be99ba276515402d22';

const TARGET_CODES = ['315002','315003','313002'];

(async () => {
  const client = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  await client.connect();
  const db = client.db('feedback');

  try {
    console.log('Finding subjects for target codes:', TARGET_CODES.join(', '));
    const subjects = await db.collection('subjects').find({ subjectCode: { $in: TARGET_CODES } }).toArray();
    if (!subjects.length) {
      console.log('No subjects found for codes, aborting.');
      await client.close();
      process.exit(0);
    }

    const subjIdMap = new Map(subjects.map(s => [String(s._id), s]));
    const codeToId = new Map(subjects.map(s => [s.subjectCode, String(s._id)]));
    console.log('Found subjects:', subjects.map(s=>`${s.subjectCode}->${s._id}`).join(', '));

    // Find assignments with departmentId = EE and subjectId in subj ids
    const subjectIds = Array.from(subjIdMap.keys()).map(id => new ObjectId(id));
    const assignments = await db.collection('facultyAssignments').find({ departmentId: EE, subjectId: { $in: subjectIds } }).toArray();

    console.log('Found', assignments.length, 'EE assignments for target subjects');

    if (!assignments.length) {
      await client.close();
      process.exit(0);
    }

    const updates = [];
    for (const a of assignments) {
      const code = subjIdMap.get(String(a.subjectId))?.subjectCode || null;
      let target = null;
      if (code === '315002' || code === '315003') target = TYEE;
      else if (code === '313002') target = SYEE;

      if (target && String(a.academicYearId || '') !== String(target)) {
        updates.push({ id: String(a._id), before: String(a.academicYearId || 'NULL'), after: target, subjectCode: code });
      } else {
        console.log(`SKIP ${String(a._id)} subjectCode=${code} current=${a.academicYearId || 'NULL'}`);
      }
    }

    if (!updates.length) {
      console.log('No updates needed.');
      await client.close();
      process.exit(0);
    }

    console.log('Applying', updates.length, 'updates...');
    const session = client.startSession();
    try {
      session.startTransaction();
      const coll = db.collection('facultyAssignments');
      for (const u of updates) {
        const res = await coll.updateOne({ _id: new ObjectId(u.id) }, { $set: { academicYearId: u.after } }, { session });
        if (res.modifiedCount === 1) console.log(`UPDATED ${u.id} : ${u.before} -> ${u.after} (code=${u.subjectCode})`);
        else console.warn(`WARN not updated ${u.id} (matched=${res.matchedCount})`);
      }
      await session.commitTransaction();
      console.log('Transaction committed.');
    } catch (err) {
      console.error('Transaction failed, aborting:', err);
      await session.abortTransaction();
      process.exit(1);
    } finally {
      session.endSession();
    }

    // re-run diagnostic
    console.log('\nRe-running diagnostic...');
    const { spawnSync } = require('child_process');
    const diag = spawnSync('node', ['-e', "require('dotenv').config(); require('./scripts/diag-hod-submission-status.js')"], { cwd: process.cwd(), env: process.env, encoding: 'utf8', maxBuffer: 1024*1024 });
    if (diag.stdout) console.log('\n--- Diagnostic stdout ---\n' + diag.stdout);
    if (diag.stderr) console.error('\n--- Diagnostic stderr ---\n' + diag.stderr);

    await client.close();
    process.exit(0);
  } catch (e) {
    console.error(e);
    await client.close();
    process.exit(1);
  }
})();
