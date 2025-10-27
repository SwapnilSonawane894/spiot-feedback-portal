require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
if (!MONGO_URI) {
  console.error('Missing MONGO_URI or MONGODB_URI in env');
  process.exit(1);
}

const EE_YEAR_IDS = [
  '68fc86d399ba276515402d23',
  '68fc86be99ba276515402d22'
];

const normalizeAcademicYearId = (ay) => {
  if (ay === undefined || ay === null) return null;
  return String(ay);
};

const getCanonicalYear = (assignment, subject, junction) => {
  if (assignment && assignment.academicYearId) return String(assignment.academicYearId);
  if (subject && subject.academicYearId) return String(subject.academicYearId);
  if (junction && junction.academicYearId) return String(junction.academicYearId);
  return null;
};

(async () => {
  const client = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  try {
    await client.connect();
    const db = client.db('feedback');

    // Fetch all assignments that explicitly have academicYearId in EE years
    const byAssignmentYear = await db.collection('facultyAssignments').find({ academicYearId: { $in: EE_YEAR_IDS } }).toArray();

    // Also fetch assignments whose subjectId is a master subject that has academicYearId in EE years
    // get subjects with academicYearId in EE years
    const subjectsWithEeYear = await db.collection('subjects').find({ academicYearId: { $in: EE_YEAR_IDS } }).toArray();
    const subjectIds = subjectsWithEeYear.map(s => String(s._id));
    const bySubjectYear = subjectIds.length ? await db.collection('facultyAssignments').find({ subjectId: { $in: subjectIds } }).toArray() : [];

    // Also include assignments that reference junctions whose junction.academicYearId is in EE years
    const junctions = await db.collection('departmentSubjects').find({ academicYearId: { $in: EE_YEAR_IDS } }).toArray();
    const junctionIds = junctions.map(j => String(j._id));
    const byJunction = junctionIds.length ? await db.collection('facultyAssignments').find({ subjectId: { $in: junctionIds } }).toArray() : [];

    // Merge unique assignments
    const map = new Map();
    [ ...byAssignmentYear, ...bySubjectYear, ...byJunction ].forEach(a => map.set(String(a._id), a));
    const assignments = Array.from(map.values());

    if (assignments.length === 0) {
      console.log('No assignments found in EE-year buckets');
      await client.close();
      process.exit(0);
    }

    // load related subjects and junctions
    const subjIds = Array.from(new Set(assignments.map(a => String(a.subjectId)).filter(Boolean)));
    const subjects = subjIds.length ? await db.collection('subjects').find({ _id: { $in: subjIds.map(id=>new ObjectId(id)) } }).toArray() : [];
    const subjectMap = new Map(subjects.map(s => [String(s._id), s]));

    // For each subject, find departmentSubjects referencing it (shared info)
    const deptSubjects = await db.collection('departmentSubjects').find({ $or: [ { subjectId: { $in: subjIds.map(id=>new ObjectId(id)) } }, { _id: { $in: subjIds.map(id=>new ObjectId(id)) } } ] }).toArray();
    const bySubjectIdJunctions = new Map();
    deptSubjects.forEach(ds => {
      const key1 = ds.subjectId ? String(ds.subjectId) : null;
      if (key1) {
        const arr = bySubjectIdJunctions.get(key1) || [];
        arr.push(ds);
        bySubjectIdJunctions.set(key1, arr);
      }
      const key2 = ds._id ? String(ds._id) : null;
      if (key2) {
        const arr2 = bySubjectIdJunctions.get(key2) || [];
        arr2.push(ds);
        bySubjectIdJunctions.set(key2, arr2);
      }
    });

    console.log('\nFound', assignments.length, 'assignments in EE-year buckets (canonical check).\n');
    for (const a of assignments) {
      const subj = subjectMap.get(String(a.subjectId));
      const junctionsForSubj = bySubjectIdJunctions.get(String(a.subjectId)) || bySubjectIdJunctions.get(String(a.subjectId)) || [];
      // also check if subjectId corresponds to a junction
      const junctionById = bySubjectIdJunctions.get(String(a.subjectId)) || [];
      const canonical = getCanonicalYear(a, subj, junctionById[0]);

      const isShared = (subj && (bySubjectIdJunctions.get(String(subj._id)) || []).length > 1) || (subj && (bySubjectIdJunctions.get(String(subj._id)) || []).length === 1 && (bySubjectIdJunctions.get(String(subj._id))[0].departmentId && bySubjectIdJunctions.get(String(subj._id))[0].departmentId !== a.departmentId));

      console.log('---');
      console.log('assignment._id:', String(a._id));
      console.log('subjectId:', String(a.subjectId || 'NULL'));
      console.log('departmentId:', String(a.departmentId || 'NULL'));
      console.log('academicYearId(on assignment):', String(a.academicYearId || 'NULL'));
      console.log('canonicalAcademicYear:', canonical || 'NULL');
      console.log('subjectCode (from subject):', subj?.subjectCode || 'NULL');
      console.log('subject.title:', subj?.title || 'NULL');
      console.log('subject.academicYearId:', String(subj?.academicYearId || 'NULL'));
      console.log('junctions referencing this subject:', (bySubjectIdJunctions.get(String(subj?._id)) || []).map(j=>({ id: String(j._id), departmentId: j.departmentId, academicYearId: j.academicYearId, subjectCode: j.subjectCode }))); 
      console.log('subjectId matches a junction? (assignment.subjectId === junction._id):', junctionById.length ? junctionById.map(j=>({ id: String(j._id), departmentId: j.departmentId, academicYearId: j.academicYearId })) : 'NO');
      console.log('full assignment doc:', JSON.stringify(a));
    }

    await client.close();
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
