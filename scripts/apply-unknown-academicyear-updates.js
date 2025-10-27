require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
if (!MONGO_URI) {
  console.error('\nERROR: No MongoDB connection string found in environment.');
  console.error("Set MONGO_URI or MONGODB_URI and re-run:\n  export MONGODB_URI='your-connection-string'\n  node scripts/apply-unknown-academicyear-updates.js\n");
  process.exit(1);
}

const EE_DEPT = '68f6390b641c7bcb2781b39d';
const CE_DEPT = '68f6390b641c7bcb2781b39e';
const DEPTS = [ { id: EE_DEPT, name: 'EE' }, { id: CE_DEPT, name: 'CE' } ];

function getAssignmentYearId(a) {
  if (a.academicYearId) return String(a.academicYearId);
  if (a.subject && a.subject.academicYearId) return String(a.subject.academicYearId);
  if (a._junction && a._junction.academicYear) return String(a._junction.academicYear.id || a._junction.academicYear._id);
  return 'unknown';
}

(async () => {
  const client = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  try {
    await client.connect();
    const db = client.db('feedback');

    const results = {};

    for (const dept of DEPTS) {
      console.log('\n=== Processing dept', dept.name, dept.id, '===');
      const session = client.startSession();
      let updatedCount = 0;
      try {
        session.startTransaction();

        const deptSubjects = await db.collection('departmentSubjects').find({ departmentId: dept.id }).toArray();
        const subjByJunction = new Map(deptSubjects.filter(ds=>ds._id).map(ds => [String(ds._id), ds]));
        const subjBySubjectId = new Map(deptSubjects.filter(ds=>ds.subjectId).map(ds => [String(ds.subjectId), ds]));
        const subjByCode = new Map();
        for (const ds of deptSubjects) {
          if (ds.subjectCode) {
            if (!subjByCode.has(ds.subjectCode)) subjByCode.set(ds.subjectCode, []);
            subjByCode.get(ds.subjectCode).push(ds);
          }
        }

        const possibleSubjectIds = Array.from(new Set([ ...deptSubjects.map(d=>String(d._id)), ...deptSubjects.map(d=>String(d.subjectId)).filter(Boolean) ]));
        let assignments = [];
        if (possibleSubjectIds.length) assignments = await db.collection('facultyAssignments').find({ subjectId: { $in: possibleSubjectIds } }).toArray();
        if (!assignments.length) assignments = await db.collection('facultyAssignments').find({ departmentId: dept.id }).toArray();

        // load subjects for subjectCode lookup
        const uniqueSubjectIds = Array.from(new Set(assignments.map(a => String(a.subjectId)).filter(Boolean)));
        const subjects = uniqueSubjectIds.length ? await db.collection('subjects').find({ _id: { $in: uniqueSubjectIds.map(id=> id) } }).toArray() : [];
        const subjectMap = new Map(subjects.map(s => [String(s._id), s]));

        for (const a of assignments) {
          const yearId = getAssignmentYearId(a);
          if (yearId !== 'unknown') continue;

          // try by junction id
          let candidateYear = null;
          if (a.subjectId && subjByJunction.has(String(a.subjectId))) {
            candidateYear = subjByJunction.get(String(a.subjectId)).academicYearId;
          }
          // try by subjectId mapped in deptSubjects
          if (!candidateYear && a.subjectId && subjBySubjectId.has(String(a.subjectId))) {
            candidateYear = subjBySubjectId.get(String(a.subjectId)).academicYearId;
          }
          // try by subjectCode from subjects collection
          if (!candidateYear && subjectMap.has(String(a.subjectId))) {
            const subj = subjectMap.get(String(a.subjectId));
            const code = subj.subjectCode;
            if (code && subjByCode.has(code)) {
              candidateYear = subjByCode.get(code)[0].academicYearId; // pick first
            }
          }
          // try assignment.subjectCode field
          if (!candidateYear && a.subjectCode && subjByCode.has(a.subjectCode)) {
            candidateYear = subjByCode.get(a.subjectCode)[0].academicYearId;
          }

          if (candidateYear) {
            // perform update
            const res = await db.collection('facultyAssignments').updateOne({ _id: a._id }, { $set: { academicYearId: candidateYear } }, { session });
            if (res.modifiedCount === 1 || res.matchedCount === 1) {
              updatedCount += 1;
              console.log('Updated assignment', String(a._id), '-> academicYearId:', candidateYear);
            } else {
              console.warn('No-op update for', String(a._id));
            }
          } else {
            console.log('No candidate found for assignment', String(a._id), 'subjectId', String(a.subjectId));
          }
        }

        await session.commitTransaction();
        session.endSession();
      } catch (e) {
        console.error('Transaction error for dept', dept.name, e);
        try { await session.abortTransaction(); } catch (err) {}
        session.endSession();
        throw e;
      }

      results[dept.name] = updatedCount;
      console.log('Dept', dept.name, 'updated assignments:', updatedCount);
    }

    console.log('\n=== Final summary ===');
    for (const [k,v] of Object.entries(results)) console.log(k, 'updated=', v);

    await client.close();
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
