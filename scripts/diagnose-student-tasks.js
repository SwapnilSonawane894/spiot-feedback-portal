#!/usr/bin/env node
const { MongoClient, ObjectId } = require('mongodb');

async function toStrId(v) {
  if (!v) return null;
  if (typeof v === 'string') return v;
  if (v instanceof ObjectId) return v.toString();
  try { return String(v); } catch { return null; }
}

async function run() {
  const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
  const DB_NAME = process.env.DB_NAME || process.env.MONGO_DB || 'feedbackPortal';
  if (!MONGO_URI) {
    console.error('Missing MONGO_URI environment variable.');
    process.exit(1);
  }

  const identifier = process.argv[2];
  if (!identifier) {
    console.error('Usage: node scripts/diagnose-student-tasks.js <studentId|email|enrollment>');
    process.exit(1);
  }

  const client = new MongoClient(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  await client.connect();
  const db = client.db(DB_NAME);

  try {
    // Try to find by ObjectId first
    let student = null;
    if (/^[0-9a-fA-F]{24}$/.test(identifier)) {
      try {
        student = await db.collection('users').findOne({ _id: new ObjectId(identifier) });
      } catch (e) { /* ignore */ }
    }

    // fallback: try by email or enrollmentNo
    if (!student) {
      student = await db.collection('users').findOne({ $or: [ { email: identifier }, { enrollmentNo: identifier }, { rollNo: identifier } ] });
    }

    if (!student) {
      console.error('Student not found with given identifier:', identifier);
      await client.close();
      process.exit(2);
    }

    console.log('\n=== Student ===');
    console.log({ id: student._id?.toString(), name: student.name, email: student.email, departmentId: toStrId(student.departmentId), academicYearId: toStrId(student.academicYearId) });

    const departmentIdStr = String(student.departmentId);
    const studentAcademicYearIdStr = student.academicYearId ? String(student.academicYearId) : null;

    console.log('\nFetching departmentSubjects for departmentId =', departmentIdStr);
    const deptRows = await db.collection('departmentSubjects').find({ departmentId: departmentIdStr }).toArray();
    console.log(' departmentSubjects count:', deptRows.length);

    // gather unique subjectIds
    const subjIds = Array.from(new Set(deptRows.map(r => r.subjectId).filter(Boolean).map(String)));
    console.log(' unique subjectIds for department:', subjIds.length);

    // fetch master subject docs
    const subjectQueryOr = [];
    const objIds = subjIds.filter(id => /^[0-9a-fA-F]{24}$/.test(id)).map(id => new ObjectId(id));
    if (objIds.length) subjectQueryOr.push({ _id: { $in: objIds } });
    const strIds = subjIds.filter(id => !(/^[0-9a-fA-F]{24}$/.test(id)));
    if (strIds.length) subjectQueryOr.push({ _id: { $in: strIds } });
    const subjectDocs = subjectQueryOr.length ? await db.collection('subjects').find(subjectQueryOr.length === 1 ? subjectQueryOr[0] : { $or: subjectQueryOr }).toArray() : [];
    console.log(' master subjects fetched:', subjectDocs.length);

    const subjectMap = new Map(subjectDocs.map(s => [s._id?.toString() || s.id, s]));

    // Determine which departmentSubjects rows match the student's academic year
    const matchedSubjectIds = [];
    const matchedRows = [];
    const noMatchRows = [];
    for (const row of deptRows) {
      const rowAY = (row.academicYearId ? String(row.academicYearId) : null);
      const subj = subjectMap.get(String(row.subjectId));
      const subjAY = subj && subj.academicYearId ? String(subj.academicYearId) : null;
      let matched = false;
      if (studentAcademicYearIdStr && rowAY === studentAcademicYearIdStr) matched = true;
      if (!matched && !rowAY && studentAcademicYearIdStr && subjAY === studentAcademicYearIdStr) matched = true;
      if (matched) {
        matchedSubjectIds.push(String(row.subjectId));
        matchedRows.push({ rowId: row._id?.toString(), subjectId: String(row.subjectId), rowAY, subjAY, subjName: subj?.name });
      } else {
        noMatchRows.push({ rowId: row._id?.toString(), subjectId: String(row.subjectId), rowAY, subjAY, subjName: subj?.name });
      }
    }

    console.log('\nMatched departmentSubjects rows for student academic year:', matchedRows.length);
    if (matchedRows.length) console.log(' sample matched row:', matchedRows.slice(0,5));
    console.log('\nUnmatched departmentSubjects rows (sample):', noMatchRows.slice(0,5));

    if (matchedSubjectIds.length === 0) {
      console.log('\nNo matched subjects found for this student/year. That explains zero tasks.');
    }

    // Build subjectId query values (strings and ObjectIds)
    const subjectIdQueryValues = [ ...matchedSubjectIds ];
    subjectIdQueryValues.push(...matchedSubjectIds.map(id => { try { return new ObjectId(id) } catch { return null } }).filter(Boolean));

    // academicYearId query values: include both string and possibly stored ObjectId
    const academicYearIdQueryValues = [];
    if (studentAcademicYearIdStr) academicYearIdQueryValues.push(studentAcademicYearIdStr);
    if (student.academicYearId && typeof student.academicYearId !== 'string') academicYearIdQueryValues.push(student.academicYearId);

    console.log('\nQuerying assignments with subjectId in matched list and academicYearId in student year values...');
    const assignQuery = {};
    if (subjectIdQueryValues.length) assignQuery.subjectId = { $in: subjectIdQueryValues };
    if (academicYearIdQueryValues.length) assignQuery.academicYearId = { $in: academicYearIdQueryValues };

    const assignments = assignQuery.subjectId ? await db.collection('facultyAssignments').find(assignQuery).toArray() : [];
    console.log(' assignments found matching subjects+year:', assignments.length);
    if (assignments.length) console.log(' sample assignment:', assignments.slice(0,3).map(a => ({ id: a._id?.toString(), staffId: a.staffId, subjectId: String(a.subjectId), semester: a.semester, academicYearId: a.academicYearId })));

    // Also show any assignments for department where academicYearId is NULL (could be intended global assignments)
    const assignmentsDeptAnyYear = await db.collection('facultyAssignments').find({ subjectId: { $in: subjIds }, departmentId: departmentIdStr }).toArray();
    console.log(' total assignments for dept subjects (any academicYear):', assignmentsDeptAnyYear.length);

    // Suggest next steps
    console.log('\n--- Suggestions ---');
    if (matchedSubjectIds.length === 0) {
      console.log('- No departmentSubject links match the student year. Either:');
      console.log('  * departmentSubjects rows are missing academicYearId and master subject academicYearId does not match student');
      console.log('  * student.academicYearId may be incorrect for this student');
      console.log('  Inspect the student record and the subject academicYearId values.');
    } else if (assignments.length === 0) {
      console.log('- There are matched subjects for this student/year, but no assignments exist for those subjects with the same academicYearId.');
      console.log('  You could: (A) create/update facultyAssignments rows with proper academicYearId, or (B) relax assignment query to allow academicYearId null if intended.');
    } else {
      console.log('- Assignments were found for this student/year. If students still see 0 tasks, check feedback documents or assignmentId vs assignment._id shapes.');
    }

    await client.close();
    process.exit(0);
  } catch (err) {
    console.error('Error during diagnosis:', err);
    await client.close();
    process.exit(1);
  }
}

run();
