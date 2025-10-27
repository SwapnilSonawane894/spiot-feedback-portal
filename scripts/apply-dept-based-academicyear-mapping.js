require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
if (!MONGO_URI) {
  console.error('Missing MONGO_URI or MONGODB_URI in env');
  process.exit(1);
}

const CO = '68f6390b641c7bcb2781b39c';
const EE = '68f6390b641c7bcb2781b39d';
const CE = '68f6390b641c7bcb2781b39e';

// academic year ids
const TYCO = '68f63990dc335227e2601fe2';
const SYCO = '68f63980dc335227e2601fe1';
const TYEE = '68fc86d399ba276515402d23';
const SYEE = '68fc86be99ba276515402d22';
const TYCE = '68ff15f064733f7c3a800828';
const SYCE = '68ff15be64733f7c3a800827';

const EE_YEAR_IDS = [TYEE, SYEE];

(async () => {
  const client = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  await client.connect();
  const db = client.db('feedback');

  try {
    console.log('Finding assignments whose canonical academic year is an EE-year id...');
    // reuse logic: assignments with assignment.academicYearId in EE_YEAR_IDS OR subject.academicYearId in EE_YEAR_IDS OR junction.academicYearId in EE_YEAR_IDS
    const byAssignmentYear = await db.collection('facultyAssignments').find({ academicYearId: { $in: EE_YEAR_IDS } }).toArray();

    const subjectsWithEeYear = await db.collection('subjects').find({ academicYearId: { $in: EE_YEAR_IDS } }).toArray();
    const subjIds = subjectsWithEeYear.map(s=>String(s._id));
    const bySubjectYear = subjIds.length ? await db.collection('facultyAssignments').find({ subjectId: { $in: subjIds } }).toArray() : [];

    const junctions = await db.collection('departmentSubjects').find({ academicYearId: { $in: EE_YEAR_IDS } }).toArray();
    const junctionIds = junctions.map(j=>String(j._id));
    const byJunction = junctionIds.length ? await db.collection('facultyAssignments').find({ subjectId: { $in: junctionIds } }).toArray() : [];

    const map = new Map();
    [ ...byAssignmentYear, ...bySubjectYear, ...byJunction ].forEach(a => map.set(String(a._id), a));
    const assignments = Array.from(map.values());

    console.log('Found', assignments.length, 'assignments to consider.');

    if (assignments.length === 0) {
      console.log('Nothing to do.');
      await client.close();
      process.exit(0);
    }

    // load subjects for codes
    const subjectIds = Array.from(new Set(assignments.map(a=>String(a.subjectId)).filter(Boolean)));
    const subjects = subjectIds.length ? await db.collection('subjects').find({ _id: { $in: subjectIds.map(id=>new ObjectId(id)) } }).toArray() : [];
    const subjectMap = new Map(subjects.map(s=>[String(s._id), s]));

    // prepare updates according to mapping logic
    const updates = [];
    for (const a of assignments) {
      const aid = String(a._id);
      const dept = String(a.departmentId || 'NULL');
      const subj = subjectMap.get(String(a.subjectId));
      const code = subj?.subjectCode || (a.subjectCode || null);
      let target = null;

      if (dept === CO) {
        if (code === '315002' || code === '315003') target = TYCO;
        else if (code === '313002') target = SYCO;
      } else if (dept === EE) {
        // keep as-is (ensure it's an EE-year)
        if (a.academicYearId && EE_YEAR_IDS.includes(String(a.academicYearId))) target = String(a.academicYearId);
        else target = null; // unclear
      } else if (dept === CE) {
        if (code === '315002' || code === '315003') target = TYCE;
        else if (code === '313002') target = SYCE;
      }

      if (target && String(a.academicYearId || '') !== String(target)) {
        updates.push({ assignmentId: aid, before: String(a.academicYearId || 'NULL'), after: target, dept, subjectId: String(a.subjectId || 'NULL'), subjectCode: code || 'NULL' });
      } else {
        // log skipped
        console.log(`SKIP ${aid} dept=${dept} code=${code || 'NULL'} current=${a.academicYearId || 'NULL'} target=${target || 'NONE'}`);
      }
    }

    console.log('\nPlanned updates:', updates.length);
    updates.forEach(u => console.log(`${u.assignmentId} | dept=${u.dept} | subject=${u.subjectId} | code=${u.subjectCode} | ${u.before} -> ${u.after}`));

    if (updates.length === 0) {
      console.log('No updates to apply.');
      await client.close();
      process.exit(0);
    }

    // apply updates in a transaction
    const session = client.startSession();
    try {
      session.startTransaction();
      const coll = db.collection('facultyAssignments');
      for (const u of updates) {
        const res = await coll.updateOne({ _id: new ObjectId(u.assignmentId) }, { $set: { academicYearId: u.after } }, { session });
        if (res.modifiedCount === 1) {
          console.log(`UPDATED ${u.assignmentId} : ${u.before} -> ${u.after}`);
        } else {
          console.warn(`WARN not updated ${u.assignmentId} (matched=${res.matchedCount})`);
        }
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

    // re-run diagnostics
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
