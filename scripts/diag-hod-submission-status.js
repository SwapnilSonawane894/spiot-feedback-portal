const { MongoClient } = require('mongodb');
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.error('\nERROR: No MongoDB connection string found in environment.');
  console.error('Set MONGO_URI or MONGODB_URI and re-run:');
  console.error("  export MONGODB_URI='your-connection-string'\n  node scripts/diag-hod-submission-status.js\n");
  process.exit(1);
}

const DEPTS = {
  CO: '68f6390b641c7bcb2781b39c',
  EE: '68f6390b641c7bcb2781b39d',
  CE: '68f6390b641c7bcb2781b39e'
};

async function getAssignmentYearId(a) {
  if (a.academicYearId) return String(a.academicYearId);
  if (a.subject && a.subject.academicYearId) return String(a.subject.academicYearId);
  if (a._junction && a._junction.academicYear) return String(a._junction.academicYear.id || a._junction.academicYear._id);
  return 'unknown';
}

(async () => {
  const client = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  try {
    await client.connect();
    const db = client.db('feedback');

    for (const [short, deptId] of Object.entries(DEPTS)) {
      console.log('\n===== DIAG for', short, deptId, '=====');

      const deptSubjects = await db.collection('departmentSubjects').find({ departmentId: deptId }).toArray();
      console.log('DeptSubjects count:', deptSubjects.length);

      const subjectMasterIds = deptSubjects.map(d => (d.subjectId ? String(d.subjectId) : null)).filter(Boolean);
      const junctionIds = deptSubjects.map(d => (d._id ? String(d._id) : null)).filter(Boolean);
      const possibleSubjectIds = Array.from(new Set([...subjectMasterIds, ...junctionIds]));
      console.log('Possible subject ids (master + junction):', possibleSubjectIds.length);

      let deptAssignments = possibleSubjectIds.length > 0 ? await db.collection('facultyAssignments').find({ subjectId: { $in: possibleSubjectIds } }).toArray() : [];
      if (!deptAssignments || deptAssignments.length === 0) {
        const deptStaff = await db.collection('staff').find({ departmentId: deptId }).toArray();
        const deptStaffIds = new Set(deptStaff.map(s => String(s._id || s.id)));
        const fallback = await db.collection('facultyAssignments').find({ departmentId: deptId }).toArray();
        deptAssignments = fallback.filter(a => a.staffId && deptStaffIds.has(String(a.staffId)));
      }

      // attach subject info
      const uniqueSubjectIds = Array.from(new Set(deptAssignments.map(a => String(a.subjectId)).filter(Boolean)));
      const subjects = uniqueSubjectIds.length > 0 ? await db.collection('subjects').find({ _id: { $in: uniqueSubjectIds.map(id => id) } }).toArray().catch(()=>[]) : [];
      const subjectMap = new Map();
      subjects.forEach(s => subjectMap.set(String(s._id), s));

      const assignmentsWithSubjects = deptAssignments.map(a => {
        const result = { ...a };
        if (subjectMap.has(String(a.subjectId))) result.subject = subjectMap.get(String(a.subjectId));
        else {
          const found = deptSubjects.find(ds => String(ds._id) === String(a.subjectId));
          if (found) { result._junction = found; if (found.subjectId) result.subject = subjectMap.get(String(found.subjectId)) || { id: found.subjectId, name: found.name, subjectCode: found.subjectCode, academicYearId: found.academicYearId } }
        }
        if (result.subject && result.subject._id) result.canonicalSubjectId = String(result.subject._id);
        else if (result._junction && result._junction._id) result.canonicalSubjectId = String(result._junction._id);
        else if (result.subjectId) result.canonicalSubjectId = String(result.subjectId);
        return result;
      });

      // dedupe
      const dedupe = new Map();
      for (const a of assignmentsWithSubjects) {
        const staffId = a.staffId || '';
        const subjectId = a.canonicalSubjectId || a.subjectId || '';
        const sem = a.semester || '';
        const key = `${staffId}::${subjectId}::${sem}`;
        if (!dedupe.has(key)) dedupe.set(key, a);
      }
      const uniqueAssignments = Array.from(dedupe.values());
      console.log('Assignments fetched for dept:', deptAssignments.length, ' Deduped:', uniqueAssignments.length);

      // group by year
      const groups = {};
      for (const a of uniqueAssignments) {
        const y = await getAssignmentYearId(a);
        if (!groups[y]) groups[y] = { count: 0, samples: new Set() };
        groups[y].count += 1;
        const code = a.subject?.subjectCode || a._junction?.subjectCode || a.subjectId || a._id;
        if (groups[y].samples.size < 5) groups[y].samples.add(String(code));
      }

      console.log('Assignments grouped by academic year:');
      for (const [y, data] of Object.entries(groups)) {
        console.log(' ', y, ':', data.count, ' sample:', Array.from(data.samples).slice(0,5).join(', '));
      }

      // students
      const students = await db.collection('users').find({ departmentId: deptId, role: { $in: ['STUDENT', 'student', 'Student'] } }).toArray();
      console.log('Students count:', students.length);

      // compute per-year totals expected
      for (const student of students.slice(0,5)) {
        const ay = student.academicYearId || 'undefined';
        const assignmentsForYear = groups[ay] ? groups[ay].count : 0;
        console.log(' student sample:', student._id || student.id, 'year:', ay, 'assignmentsForYear:', assignmentsForYear);
      }
    }

    await client.close();
  } catch (e) { console.error(e); process.exit(1); }
})();
