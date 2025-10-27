require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
if (!MONGO_URI) {
  console.error('\nERROR: No MongoDB connection string found in environment.');
  console.error("Set MONGO_URI or MONGODB_URI and re-run:\n  export MONGODB_URI='your-connection-string'\n  node scripts/dryrun-remaining-assignments.js\n");
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
  return ay;
};

const getAssignmentYearId = (a) => {
  if (a.academicYearId) return String(a.academicYearId);
  if (a.subject && a.subject.academicYearId) return String(a.subject.academicYearId);
  if (a._junction && a._junction.academicYear) return String(a._junction.academicYear.id || a._junction.academicYear._id);
  return 'unknown';
};

(async () => {
  const client = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  try {
    await client.connect();
    const db = client.db('feedback');

    for (const dept of DEPTS) {
      console.log('\n===== DRY-RUN REMAINING for', dept.name, dept.id, '=====');

      const deptSubjects = await db.collection('departmentSubjects').find({ departmentId: dept.id }).toArray();
      const deptYears = new Set(deptSubjects.map(d => normalizeAcademicYearId(d.academicYearId)).filter(Boolean));

      console.log('Dept has', deptSubjects.length, 'junction rows and', deptYears.size, 'academicYearIds');
      console.log('Dept academicYearIds:', Array.from(deptYears).join(', ') || '(none)');

      // possible subject ids
      const possibleIds = Array.from(new Set([ ...deptSubjects.map(d=>String(d._id)), ...deptSubjects.map(d=>String(d.subjectId)).filter(Boolean) ]));

      const assignments = possibleIds.length > 0 ? await db.collection('facultyAssignments').find({ subjectId: { $in: possibleIds } }).toArray() : [];

      // also include assignments by departmentId in case
      const byDept = await db.collection('facultyAssignments').find({ departmentId: dept.id }).toArray();
      // merge unique by _id
      const map = new Map();
      assignments.concat(byDept).forEach(a => map.set(String(a._id), a));
      const all = Array.from(map.values());

      const subjectIds = Array.from(new Set(all.map(a=>String(a.subjectId)).filter(Boolean)));
      const subjects = subjectIds.length ? await db.collection('subjects').find({ _id: { $in: subjectIds } }).toArray() : [];
      const subjectMap = new Map(subjects.map(s => [String(s._id), s]));

      // Build dept subjectCode -> junction mapping
      const codeToJunctions = new Map();
      deptSubjects.forEach(ds => {
        if (ds.subjectCode) {
          const arr = codeToJunctions.get(ds.subjectCode) || [];
          arr.push(ds);
          codeToJunctions.set(ds.subjectCode, arr);
        }
      });

      const unexpected = [];

      for (const a of all) {
        const canonicalYear = getAssignmentYearId(Object.assign({}, a, { subject: subjectMap.get(String(a.subjectId)) }));
        if (canonicalYear === 'unknown' || !deptYears.has(canonicalYear)) {
          // it's unexpected
          const subj = subjectMap.get(String(a.subjectId));
          const subjectCode = subj?.subjectCode || (a.subjectCode || null);

          // suggested mapping: if subjectCode matches a junction, pick that junction.academicYearId
          let suggested = null;
          if (subjectCode && codeToJunctions.has(subjectCode)) {
            const j = codeToJunctions.get(subjectCode)[0];
            suggested = normalizeAcademicYearId(j.academicYearId) || null;
          }
          // fallback: if junction by subjectId exists
          const byJ = deptSubjects.find(ds => String(ds._id) === String(a.subjectId) || (ds.subjectId && String(ds.subjectId) === String(a.subjectId)));
          if (!suggested && byJ) suggested = normalizeAcademicYearId(byJ.academicYearId) || null;

          unexpected.push({ assignmentId: String(a._id), currentYear: canonicalYear, subjectId: String(a.subjectId || ''), subjectCode, suggested });
        }
      }

      if (unexpected.length === 0) {
        console.log('No unexpected assignments found for', dept.name);
      } else {
        console.log('Found', unexpected.length, 'unexpected assignments:');
        for (const u of unexpected) {
          console.log(`${u.assignmentId} | currentYear: ${u.currentYear} | subjectId: ${u.subjectId} | subjectCode: ${u.subjectCode || 'NULL'} | suggested: ${u.suggested || 'NONE'}`);
        }
      }

    }

    await client.close();
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
