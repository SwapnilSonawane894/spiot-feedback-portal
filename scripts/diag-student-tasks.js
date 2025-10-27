const { MongoClient, ObjectId } = require('mongodb');
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.error('\nERROR: No MongoDB connection string found in environment.');
  console.error("Set MONGO_URI or MONGODB_URI and re-run:\n  export MONGODB_URI='your-connection-string'\n  node scripts/diag-student-tasks.js\n");
  process.exit(1);
}

const CO_DEPT = '68f6390b641c7bcb2781b39c';
const TYCO = '68f63990dc335227e2601fe2';
const SYCO = '68f63980dc335227e2601fe1';

(async () => {
  const client = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  try {
    await client.connect();
    const db = client.db('feedback');

    const students = {};
    students.ty = await db.collection('users').findOne({ departmentId: CO_DEPT, academicYearId: TYCO, role: { $in: ['STUDENT','student','Student'] } });
    students.sy = await db.collection('users').findOne({ departmentId: CO_DEPT, academicYearId: SYCO, role: { $in: ['STUDENT','student','Student'] } });

    for (const [label, student] of Object.entries(students)) {
      console.log('\n=== STUDENT DIAG', label.toUpperCase(), '===');
      if (!student) { console.log('No student found for', label); continue; }
      console.log('Student id:', student._id, 'academicYearId:', student.academicYearId);

      // Gather deptSubjects for CO
      const deptSubjects = await db.collection('departmentSubjects').find({ departmentId: CO_DEPT }).toArray();
      const possibleSubjectIds = Array.from(new Set([ ...deptSubjects.map(d=>String(d._id)), ...deptSubjects.map(d=>String(d.subjectId)).filter(Boolean) ]));

      // Fetch assignments referencing those subject ids OR departmentId
      let assignments = [];
      if (possibleSubjectIds.length) {
        assignments = await db.collection('facultyAssignments').find({ subjectId: { $in: possibleSubjectIds } }).toArray();
      }
      if (assignments.length === 0) {
        assignments = await db.collection('facultyAssignments').find({ departmentId: CO_DEPT }).toArray();
      }

      // Attach subject/junction
      const uniqueSubjectIds = Array.from(new Set(assignments.map(a => String(a.subjectId)).filter(Boolean)));
      const subjects = uniqueSubjectIds.length > 0 ? await db.collection('subjects').find({ _id: { $in: uniqueSubjectIds.map(id => id) } }).toArray().catch(()=>[]) : [];
      const subjectMap = new Map(subjects.map(s => [String(s._id), s]));

      const tasks = assignments.map(a => {
        const t = { ...a };
        if (subjectMap.has(String(a.subjectId))) t.subject = subjectMap.get(String(a.subjectId));
        else {
          const found = deptSubjects.find(ds => String(ds._id) === String(a.subjectId));
          if (found) { t._junction = found; if (found.subjectId) t.subject = subjectMap.get(String(found.subjectId)) || { id: found.subjectId, subjectCode: found.subjectCode, academicYearId: found.academicYearId } }
        }
        t.canonical = t.subject && t.subject._id ? String(t.subject._id) : (t._junction && t._junction._id ? String(t._junction._id) : String(t.subjectId || t._id));
        return t;
      });

      // Filter tasks for student's academic year (subject or assignment)
      const studentAy = String(student.academicYearId);
      const tasksForStudent = tasks.filter(t => {
        if (t.academicYearId && String(t.academicYearId) === studentAy) return true;
        if (t.subject && t.subject.academicYearId && String(t.subject.academicYearId) === studentAy) return true;
        if (t._junction && t._junction.academicYear && String(t._junction.academicYear.id || t._junction.academicYear._id) === studentAy) return true;
        return false;
      });

      console.log('Total assignments found for dept (post-filter):', tasksForStudent.length);

      // Detect duplicates by canonical
      const byCanonical = new Map();
      for (const t of tasksForStudent) {
        const key = `${t.canonical}::${t.semester||''}::${t.staffId||''}`;
        if (!byCanonical.has(key)) byCanonical.set(key, []);
        byCanonical.get(key).push(t);
      }

      console.log('Unique canonical groups:', byCanonical.size);
      console.log('Groups with >1 entries (possible duplicates):');
      let dupCount = 0;
      for (const [k, arr] of byCanonical.entries()) {
        if (arr.length > 1) {
          dupCount += 1;
          console.log(' -', k, 'count=', arr.length, 'sample subjectCodes=', arr.map(x => x.subject?.subjectCode || x._junction?.subjectCode || x.subjectId).slice(0,5).join(', '));
        }
      }
      if (dupCount === 0) console.log(' No duplicate canonical groups found for this student.');

      console.log('\nList of tasks (canonicalId, subjectCode, assignmentId, academicYearId):');
      tasksForStudent.forEach(t => console.log(' ', t.canonical, t.subject?.subjectCode || t._junction?.subjectCode || '-', t._id || '-', t.academicYearId || (t.subject && t.subject.academicYearId) || (t._junction && (t._junction.academicYear && (t._junction.academicYear.id||t._junction.academicYear._id))) || 'none'));
    }

    await client.close();
  } catch (e) { console.error(e); process.exit(1); }
})();
