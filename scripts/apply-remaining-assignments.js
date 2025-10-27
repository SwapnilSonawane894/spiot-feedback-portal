require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
if (!MONGO_URI) {
  console.error('\nERROR: No MongoDB connection string found in environment.');
  console.error("Set MONGODB_URI or MONGO_URI and re-run:\n  export MONGODB_URI='your-connection-string'\n  node scripts/apply-remaining-assignments.js\n");
  process.exit(1);
}

const EE = { id: '68f6390b641c7bcb2781b39d', name: 'EE' };
const CE = { id: '68f6390b641c7bcb2781b39e', name: 'CE' };
const DEPTS = [EE, CE];

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

    // Gather unexpected assignments per dept (same logic as dry-run)
    const suggestionsByAssignment = new Map();
    const assignmentIdsSet = new Set();

    for (const dept of DEPTS) {
      const deptSubjects = await db.collection('departmentSubjects').find({ departmentId: dept.id }).toArray();
      const deptYears = new Set(deptSubjects.map(d => normalizeAcademicYearId(d.academicYearId)).filter(Boolean));
      const possibleIds = Array.from(new Set([ ...deptSubjects.map(d=>String(d._id)), ...deptSubjects.map(d=>String(d.subjectId)).filter(Boolean) ]));
      const assignments = possibleIds.length > 0 ? await db.collection('facultyAssignments').find({ subjectId: { $in: possibleIds } }).toArray() : [];
      const byDept = await db.collection('facultyAssignments').find({ departmentId: dept.id }).toArray();
      const map = new Map();
      assignments.concat(byDept).forEach(a => map.set(String(a._id), a));
      const all = Array.from(map.values());

      const subjectIds = Array.from(new Set(all.map(a=>String(a.subjectId)).filter(Boolean)));
      const subjects = subjectIds.length ? await db.collection('subjects').find({ _id: { $in: subjectIds } }).toArray() : [];
      const subjectMap = new Map(subjects.map(s => [String(s._id), s]));

      const codeToJunctions = new Map();
      deptSubjects.forEach(ds => {
        if (ds.subjectCode) {
          const arr = codeToJunctions.get(ds.subjectCode) || [];
          arr.push(ds);
          codeToJunctions.set(ds.subjectCode, arr);
        }
      });

      for (const a of all) {
        const subj = subjectMap.get(String(a.subjectId));
        const canonicalYear = getAssignmentYearId(Object.assign({}, a, { subject: subj }));
        if (!canonicalYear || !deptYears.has(canonicalYear)) {
          // unexpected
          let subjectCode = subj?.subjectCode || (a.subjectCode || null);
          let suggested = null;
          if (subjectCode && codeToJunctions.has(subjectCode)) {
            const j = codeToJunctions.get(subjectCode)[0];
            suggested = normalizeAcademicYearId(j.academicYearId) || null;
          }
          const byJ = deptSubjects.find(ds => String(ds._id) === String(a.subjectId) || (ds.subjectId && String(ds.subjectId) === String(a.subjectId)));
          if (!suggested && byJ) suggested = normalizeAcademicYearId(byJ.academicYearId) || null;

          const entry = suggestionsByAssignment.get(String(a._id)) || { assignmentId: String(a._id), candidates: [] };
          entry.candidates.push({ dept: dept.name, deptId: dept.id, currentYear: canonicalYear || null, suggested });
          suggestionsByAssignment.set(String(a._id), entry);
          assignmentIdsSet.add(String(a._id));
        }
      }
    }

    const allAssignmentIds = Array.from(assignmentIdsSet);
    if (allAssignmentIds.length === 0) {
      console.log('No remaining unexpected assignments found. Nothing to apply.');
      await client.close();
      process.exit(0);
    }

    // Fetch assignments to inspect departmentId and choose correct suggestion
  const assignments = await db.collection('facultyAssignments').find({ _id: { $in: allAssignmentIds.map(id=>new ObjectId(id)) } }).toArray();
    const assignmentMap = new Map(assignments.map(a => [String(a._id), a]));

    // Build chosen updates
    const updates = [];
    for (const [aid, info] of suggestionsByAssignment.entries()) {
      const assignment = assignmentMap.get(aid);
      const deptId = assignment && (assignment.departmentId ? String(assignment.departmentId) : null);

      // if assignment has departmentId matching EE/CE, prefer candidate for that dept
      let chosen = null;
      if (deptId) {
        const cand = info.candidates.find(c => c.deptId === deptId);
        if (cand && cand.suggested) chosen = cand.suggested;
      }

      // otherwise prefer the first candidate with suggested
      if (!chosen) {
        const cand2 = info.candidates.find(c => c.suggested);
        if (cand2) chosen = cand2.suggested;
      }

      if (chosen) {
        updates.push({ assignmentId: aid, before: getAssignmentYearId(assignment) || null, after: chosen });
      } else {
        console.log(`Skipping ${aid} — no viable suggested mapping found`);
      }
    }

    if (updates.length === 0) {
      console.log('No updates to apply (no chosen suggestions).');
      await client.close();
      process.exit(0);
    }

    console.log('\nPlanned updates:', updates.length);
    updates.forEach(u => console.log(`${u.assignmentId} : ${u.before || 'NULL'} -> ${u.after}`));

    // Apply updates in a transaction
    const session = client.startSession();
    try {
      session.startTransaction();
      const coll = db.collection('facultyAssignments');
      for (const u of updates) {
        const upd = await coll.updateOne({ _id: new ObjectId(u.assignmentId) }, { $set: { academicYearId: u.after } }, { session });
        if (upd.modifiedCount === 0) {
          console.warn(`WARN: ${u.assignmentId} was not modified (matchedCount=${upd.matchedCount})`);
          // still try to fetch current doc for logging
        }
        const newDoc = await coll.findOne({ _id: new ObjectId(u.assignmentId) }, { session });
        console.log(`UPDATED ${u.assignmentId} : ${u.before || 'NULL'} -> ${newDoc?.academicYearId || 'NULL'}`);
      }
      await session.commitTransaction();
      console.log('\nTransaction committed successfully.');
    } catch (txErr) {
      console.error('Transaction failed, aborting:', txErr);
      await session.abortTransaction();
      process.exit(1);
    } finally {
      session.endSession();
    }

    await client.close();
    console.log('\nNow re-running diagnostics (diag-hod-submission-status.js) to verify...');

    // run diagnostic script by spawning node
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
