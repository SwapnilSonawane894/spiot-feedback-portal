require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
if (!MONGO_URI) {
  console.error('Missing MONGO_URI or MONGODB_URI in env');
  process.exit(1);
}

const EE_DEPT = '68f6390b641c7bcb2781b39d';
const TYEE = '68fc86d399ba276515402d23';
const SYEE = '68fc86be99ba276515402d22';
const EE_YEARS = [TYEE, SYEE];

const CODE_TO_EE_YEAR = {
  '315002': TYEE,
  '315003': TYEE,
  '313002': SYEE,
};

(async function(){
  const client = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  await client.connect();
  const db = client.db('feedback');

  try {
    console.log('Loading departmentSubjects for EE...');
    const deptSubjects = await db.collection('departmentSubjects').find({ departmentId: EE_DEPT }).toArray();
    const junctionIds = deptSubjects.map(d => String(d._id));
    const masterIds = deptSubjects.map(d => String(d.subjectId)).filter(Boolean);
    const possibleIds = Array.from(new Set([ ...junctionIds, ...masterIds ]));

    console.log('EE deptSubjects:', deptSubjects.length, 'possible subject ids:', possibleIds.length);

    if (possibleIds.length === 0) {
      console.log('No possible ids found, aborting.');
      await client.close();
      process.exit(0);
    }

    // Build ObjectId list safely
    const possibleObjectIds = possibleIds.map(id => {
      try { return new ObjectId(id); } catch (e) { return id; }
    }).filter(Boolean);

    // Find assignments whose subjectId is in possibleIds and academicYearId NOT in EE_YEARS
    const query = {
      subjectId: { $in: possibleObjectIds },
      $or: [
        { academicYearId: { $nin: EE_YEARS } },
        { academicYearId: { $exists: false } },
        { academicYearId: null }
      ]
    };

    const assignments = await db.collection('facultyAssignments').find(query).toArray();
    console.log('Found', assignments.length, 'assignments attached to EE possible subjects with non-EE academicYearId');
    if (assignments.length === 0) {
      await client.close();
      process.exit(0);
    }

    // Load subjects for subjectCodes
    const subjectIds = Array.from(new Set(assignments.map(a => String(a.subjectId)).filter(Boolean)));
    const subjects = subjectIds.length ? await db.collection('subjects').find({ _id: { $in: subjectIds.map(id=>new ObjectId(id)) } }).toArray() : [];
    const subjectMap = new Map(subjects.map(s => [String(s._id), s]));

    // Prepare updates
    const updates = [];
    for (const a of assignments) {
      const sid = String(a.subjectId || '');
      const subj = subjectMap.get(sid);
      const code = subj?.subjectCode || (a.subjectCode || null);
      const suggested = code ? CODE_TO_EE_YEAR[code] : null;
      if (suggested) {
        if (String(a.academicYearId || '') !== String(suggested)) {
          updates.push({ id: String(a._id), before: String(a.academicYearId || 'NULL'), after: suggested, subjectId: sid, subjectCode: code, dept: String(a.departmentId || 'NULL') });
        } else {
          console.log(`No change needed for ${a._id} (already ${a.academicYearId})`);
        }
      } else {
        console.log(`No suggested mapping for assignment ${a._id} subject ${sid} code=${code || 'NULL'}`);
      }
    }

    console.log('Planned updates count:', updates.length);
    updates.forEach(u => console.log(`${u.id} | dept=${u.dept} | subject=${u.subjectId} | code=${u.subjectCode} | ${u.before} -> ${u.after}`));

    if (updates.length === 0) {
      console.log('Nothing to apply.');
      await client.close();
      process.exit(0);
    }

    // Apply updates transactionally
    const session = client.startSession();
    try {
      session.startTransaction();
      const coll = db.collection('facultyAssignments');
      for (const u of updates) {
        const res = await coll.updateOne({ _id: new ObjectId(u.id) }, { $set: { academicYearId: u.after } }, { session });
        if (res.modifiedCount === 1) console.log(`UPDATED ${u.id} : ${u.before} -> ${u.after} (dept=${u.dept} code=${u.subjectCode})`);
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

    // Re-run diagnostic
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
