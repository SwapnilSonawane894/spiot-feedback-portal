const { MongoClient, ObjectId } = require('mongodb');
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.error('\nERROR: No MongoDB connection string found in environment.');
  console.error("Set MONGO_URI or MONGODB_URI and re-run:\n  export MONGODB_URI='your-connection-string'\n  node scripts/diag-students-ee-ce.js\n");
  process.exit(1);
}

// Department & academic year IDs (edit if different in your environment)
const EE_DEPT = '68f6390b641c7bcb2781b39d';
const CE_DEPT = '68f6390b641c7bcb2781b39e';

const TYEE = '68fc86d399ba276515402d23';
const SYEE = '68fc86be99ba276515402d22';
const TYCE = '68ff15f064733f7c3a800828';
const SYCE = '68ff15be64733f7c3a800827';

const SAMPLE_STUDENTS = [
  { label: 'TYEE', dept: EE_DEPT, academicYearId: TYEE },
  { label: 'SYEE', dept: EE_DEPT, academicYearId: SYEE },
  { label: 'TYCE', dept: CE_DEPT, academicYearId: TYCE },
  { label: 'SYCE', dept: CE_DEPT, academicYearId: SYCE },
];

(async () => {
  const client = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  try {
    await client.connect();
    const db = client.db('feedback');

    for (const s of SAMPLE_STUDENTS) {
      console.log('\n=== STUDENT', s.label, 'DIAGNOSTIC ===');

      // Find a student user matching dept + academicYearId
      const student = await db.collection('users').findOne({ departmentId: s.dept, academicYearId: s.academicYearId, role: { $in: ['STUDENT','student','Student'] } });
      if (!student) {
        console.log('No student user found for', s.label, ` (dept=${s.dept}, academicYearId=${s.academicYearId})`);
        continue;
      }
      console.log('Found student', student._id.toString());

      // Dept subjects (junctions)
      const deptSubjects = await db.collection('departmentSubjects').find({ departmentId: s.dept }).toArray();
      console.log('Dept subjects (junctions) count:', deptSubjects.length);

      const possibleSubjectIds = Array.from(new Set([
        ...deptSubjects.map(d => String(d._id)),
        ...deptSubjects.map(d => String(d.subjectId)).filter(Boolean),
      ]));
      console.log('Possible subject IDs count:', possibleSubjectIds.length);

      // Fetch assignments owned by dept OR referencing possibleSubjectIds
      const assignmentsQuery = {
        $or: [
          { departmentId: s.dept },
          { subjectId: { $in: possibleSubjectIds } }
        ]
      };

      const fetched = await db.collection('facultyAssignments').find(assignmentsQuery).toArray();
      console.log('Fetched assignments count (including shared):', fetched.length);

      // Load subjects referenced by the assignments
      const subjIds = Array.from(new Set(fetched.map(a => String(a.subjectId)).filter(Boolean)));
      const subjects = subjIds.length ? await db.collection('subjects').find({ _id: { $in: subjIds } }).toArray() : [];
      const subjectMap = new Map(subjects.map(s => [String(s._id), s]));

      // Build tasks with canonical subject and subjectCode
      const tasks = fetched.map(a => {
        const t = { ...a };
        let subj = subjectMap.get(String(a.subjectId));
        let junction = null;
        if (!subj) {
          junction = deptSubjects.find(ds => String(ds._id) === String(a.subjectId));
          if (junction && junction.subjectId) subj = subjectMap.get(String(junction.subjectId)) || { _id: junction.subjectId, subjectCode: junction.subjectCode, academicYearId: junction.academicYearId };
        }
        t.subject = subj || null;
        t._junction = junction || null;
        t.canonical = t.subject && t.subject._id ? String(t.subject._id) : (t._junction && t._junction._id ? String(t._junction._id) : String(t.subjectId || t._id));
        t.subjectCode = t.subject?.subjectCode || t._junction?.subjectCode || null;
        return t;
      });

      // Filter by student's academic year (subject/junction/assignment)
      const studentAy = String(s.academicYearId);
      const tasksForStudent = tasks.filter(t => {
        if (t.academicYearId && String(t.academicYearId) === studentAy) return true;
        if (t.subject && t.subject.academicYearId && String(t.subject.academicYearId) === studentAy) return true;
        if (t._junction && (t._junction.academicYear || t._junction.academicYearId)) {
          const ja = t._junction.academicYear ? (t._junction.academicYear.id || t._junction.academicYear._id) : t._junction.academicYearId;
          if (String(ja) === studentAy) return true;
        }
        return false;
      });

      console.log('Assignments after academicYear filter:', tasksForStudent.length);

      // Deduplicate by canonical + semester + staff
      const groups = new Map();
      for (const t of tasksForStudent) {
        const key = `${t.canonical}::${t.semester||''}::${t.staffId||''}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(t);
      }

      console.log('Unique canonical groups (expected subjects count):', groups.size);
      console.log('Subject codes in response:');
      for (const [k, arr] of groups.entries()) {
        const any = arr[0];
        console.log(' -', any.canonical, any.subjectCode || '-', 'assignments=', arr.length);
      }

      console.log('\nSample listing (canonicalId, subjectCode, assignmentIds):');
      for (const [k, arr] of groups.entries()) {
        console.log(' ', arr[0].canonical, arr[0].subjectCode || '-', arr.map(x => String(x._id)).slice(0,5).join(', '));
      }
    }

    await client.close();
  } catch (err) {
    console.error('Error during diagnostic:', err);
    process.exit(1);
  }
})();
