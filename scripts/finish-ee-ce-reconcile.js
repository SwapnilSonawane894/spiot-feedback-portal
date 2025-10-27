require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
if (!MONGO_URI) {
  console.error('\nERROR: No MongoDB connection string found in environment.');
  console.error("Set MONGODB_URI or MONGO_URI and re-run:\n  export MONGODB_URI='your-connection-string'\n  node scripts/finish-ee-ce-reconcile.js\n");
  process.exit(1);
}

const EE = { id: '68f6390b641c7bcb2781b39d', name: 'EE' };
const CE = { id: '68f6390b641c7bcb2781b39e', name: 'CE' };

const normalizeAcademicYearId = (ay) => {
  if (ay === undefined || ay === null) return null;
  if (typeof ay === 'string') {
    const trimmed = ay.trim();
    if (trimmed === '' || trimmed.toLowerCase() === 'null') return null;
    return trimmed;
  }
  return String(ay);
};

const getAssignmentYearId = (a) => {
  if (!a) return null;
  if (a.academicYearId) return String(a.academicYearId);
  if (a.subject && a.subject.academicYearId) return String(a.subject.academicYearId);
  if (a._junction && a._junction.academicYear) return String(a._junction.academicYear.id || a._junction.academicYear._id || a._junction.academicYear);
  return null;
};

(async () => {
  const client = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  try {
    await client.connect();
    const db = client.db('feedback');

    console.log('\n== Focused dry-run: EE assignments outside EE academic years (including CE-year ids) ==');

    // EE deptSubjects and years
    const deptSubjects = await db.collection('departmentSubjects').find({ departmentId: EE.id }).toArray();
    const deptYears = new Set(deptSubjects.map(d => normalizeAcademicYearId(d.academicYearId)).filter(Boolean));
    console.log('EE deptSubjects:', deptSubjects.length, 'EE deptYears:', Array.from(deptYears).join(', '));

    const possibleIds = Array.from(new Set([ ...deptSubjects.map(d=>String(d._id)), ...deptSubjects.map(d=>String(d.subjectId)).filter(Boolean) ]));

    // Find assignments relevant to EE: either departmentId is EE OR subjectId in possibleIds
    const assignmentsCursor = db.collection('facultyAssignments').find({ $or: [ { departmentId: EE.id }, { subjectId: { $in: possibleIds } } ] });
    const assignments = await assignmentsCursor.toArray();

    // load subjects
    const subjectIds = Array.from(new Set(assignments.map(a=>String(a.subjectId)).filter(Boolean)));
    const subjects = subjectIds.length ? await db.collection('subjects').find({ _id: { $in: subjectIds.map(id=>new ObjectId(id)) } }).toArray() : [];
    const subjectMap = new Map(subjects.map(s => [String(s._id), s]));

    // build code->junction map
    const codeToJunctions = new Map();
    deptSubjects.forEach(ds => {
      if (ds.subjectCode) {
        const arr = codeToJunctions.get(ds.subjectCode) || [];
        arr.push(ds);
        codeToJunctions.set(ds.subjectCode, arr);
      }
    });

    const unexpected = [];
    for (const a of assignments) {
      const subj = subjectMap.get(String(a.subjectId));
      const canonicalYear = getAssignmentYearId(Object.assign({}, a, { subject: subj }));
      if (!canonicalYear || !deptYears.has(canonicalYear)) {
        // suggest mapping
        let suggested = null;
        const subjectCode = subj?.subjectCode || a.subjectCode || null;
        if (subjectCode && codeToJunctions.has(subjectCode)) {
          suggested = normalizeAcademicYearId(codeToJunctions.get(subjectCode)[0].academicYearId) || null;
        }
        const byJ = deptSubjects.find(ds => String(ds._id) === String(a.subjectId) || (ds.subjectId && String(ds.subjectId) === String(a.subjectId)));
        if (!suggested && byJ) suggested = normalizeAcademicYearId(byJ.academicYearId) || null;
        unexpected.push({ assignmentId: String(a._id), currentYear: canonicalYear || null, subjectId: String(a.subjectId || ''), subjectCode, suggested });
      }
    }

    if (unexpected.length === 0) {
      console.log('No remaining unexpected EE assignments found.');
      await client.close();
      process.exit(0);
    }

    console.log('Found', unexpected.length, 'EE unexpected assignments:');
    unexpected.forEach(u => console.log(`${u.assignmentId} | currentYear: ${u.currentYear} | subjectId: ${u.subjectId} | subjectCode: ${u.subjectCode || 'NULL'} | suggested: ${u.suggested || 'NONE'}`));

    // Decide to apply suggested where present
    const updates = unexpected.filter(u => u.suggested).map(u => ({ assignmentId: u.assignmentId, before: u.currentYear, after: u.suggested }));
    if (updates.length === 0) {
      console.log('No suggested mappings available for EE unexpected assignments. Aborting apply.');
      await client.close();
      process.exit(0);
    }

    console.log('\nApplying', updates.length, 'updates transactionally...');
    const session = client.startSession();
    try {
      session.startTransaction();
      const coll = db.collection('facultyAssignments');
      for (const u of updates) {
        const upd = await coll.updateOne({ _id: new ObjectId(u.assignmentId) }, { $set: { academicYearId: u.after } }, { session });
        if (upd.modifiedCount === 0) console.warn(`WARN: ${u.assignmentId} not modified (matched=${upd.matchedCount})`);
        const newDoc = await coll.findOne({ _id: new ObjectId(u.assignmentId) }, { session });
        console.log(`UPDATED ${u.assignmentId} : ${u.before || 'NULL'} -> ${newDoc?.academicYearId || 'NULL'}`);
      }
      await session.commitTransaction();
      console.log('Transaction committed.');
    } catch (txErr) {
      console.error('Transaction failed, aborting:', txErr);
      await session.abortTransaction();
      process.exit(1);
    } finally {
      session.endSession();
    }

    await client.close();

    // Re-run full diagnostic to confirm final state
    console.log('\nRe-running full diagnostic (diag-hod-submission-status.js')
    const { spawnSync } = require('child_process');
    const diag = spawnSync('node', ['-e', "require('dotenv').config(); require('./scripts/diag-hod-submission-status.js')"], { cwd: process.cwd(), env: process.env, encoding: 'utf8', maxBuffer: 1024*1024 });
    if (diag.stdout) console.log('\n--- Diagnostic stdout ---\n' + diag.stdout);
    if (diag.stderr) console.error('\n--- Diagnostic stderr ---\n' + diag.stderr);

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
