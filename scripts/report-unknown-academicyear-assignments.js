require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
if (!MONGO_URI) {
  console.error('\nERROR: No MongoDB connection string found in environment.');
  console.error("Set MONGO_URI or MONGODB_URI and re-run:\n  export MONGODB_URI='your-connection-string'\n  node scripts/report-unknown-academicyear-assignments.js\n");
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

    const finalSummary = {};

    for (const dept of DEPTS) {
      console.log('\n===== DRY-RUN for', dept.name, dept.id, '=====');

      const deptSubjects = await db.collection('departmentSubjects').find({ departmentId: dept.id }).toArray();
      const subjMapById = new Map(deptSubjects.filter(ds => ds._id).map(ds => [String(ds._id), ds]));
      const subjMapByCode = new Map();
      deptSubjects.forEach(ds => {
        if (ds.subjectCode) {
          const arr = subjMapByCode.get(ds.subjectCode) || [];
          arr.push(ds);
          subjMapByCode.set(ds.subjectCode, arr);
        }
      });

      const possibleSubjectIds = Array.from(new Set([ ...deptSubjects.map(d=>String(d._id)), ...deptSubjects.map(d=>String(d.subjectId)).filter(Boolean) ]));

      const assignments = possibleSubjectIds.length > 0 ? await db.collection('facultyAssignments').find({ subjectId: { $in: possibleSubjectIds } }).toArray() : [];
      // also include assignments by departmentId as fallback
      if (assignments.length === 0) assignments.push(...await db.collection('facultyAssignments').find({ departmentId: dept.id }).toArray());

      const uniqueSubjectIds = Array.from(new Set(assignments.map(a => String(a.subjectId)).filter(Boolean)));
      const subjects = uniqueSubjectIds.length > 0 ? await db.collection('subjects').find({ _id: { $in: uniqueSubjectIds.map(id => id) } }).toArray().catch(()=>[]) : [];
      const subjectMap = new Map(subjects.map(s => [String(s._id), s]));

      const unknowns = [];

      for (const a of assignments) {
        const yearId = getAssignmentYearId(a);
        if (yearId === 'unknown') {
          // attach subject/junction info if present
          let subj = subjectMap.get(String(a.subjectId));
          let junction = subjMapById.get(String(a.subjectId));
          let subjectCode = subj ? subj.subjectCode : (junction ? junction.subjectCode : (a.subjectCode || null));

          // candidate matches: try to find departmentSubjects with same subjectCode OR subjectId
          const candidates = [];
          if (subjectCode) {
            const matched = subjMapByCode.get(subjectCode) || [];
            matched.forEach(m => candidates.push({ type: 'byCode', subjectCode: m.subjectCode, academicYearId: m.academicYearId, junctionId: m._id, subjectId: m.subjectId }));
          }
          // also check if the assignment.subjectId matches any deptSubject.subjectId
          const matchBySubjectId = deptSubjects.filter(ds => ds.subjectId && String(ds.subjectId) === String(a.subjectId));
          matchBySubjectId.forEach(m => candidates.push({ type: 'bySubjectId', subjectCode: m.subjectCode, academicYearId: m.academicYearId, junctionId: m._id, subjectId: m.subjectId }));

          unknowns.push({ assignmentId: String(a._id), subjectId: String(a.subjectId || ''), subjectCode, candidates });
        }
      }

      console.log('Found', unknowns.length, 'unknown assignments for', dept.name);
      if (unknowns.length > 0) {
        console.log('\nAssignmentId | subjectId | subjectCode | candidateMappings');
        for (const u of unknowns) {
          const candStr = u.candidates.length > 0 ? u.candidates.map(c => `${c.academicYearId || 'NULL'}(junction:${c.junctionId||'n/a'},type:${c.type})`).join(' | ') : 'NO_CANDIDATES';
          console.log(`${u.assignmentId} | ${u.subjectId} | ${u.subjectCode || 'NULL'} | ${candStr}`);
        }
      }

      finalSummary[dept.name] = { unknownCount: unknowns.length };
    }

    console.log('\n===== SUMMARY =====');
    for (const [k, v] of Object.entries(finalSummary)) console.log(k, 'unknown assignments:', v.unknownCount);

    await client.close();
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
