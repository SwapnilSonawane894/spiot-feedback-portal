#!/usr/bin/env node
import { MongoClient, ObjectId } from 'mongodb';

// Usage:
// MONGODB_URI="..." node scripts/diagnose-student-tasks.mjs --email 23213070244
// or
// MONGODB_URI="..." node scripts/diagnose-student-tasks.mjs --id 68fc86ec99ba276515402d24

const argv = process.argv.slice(2);
let email = null;
let id = null;
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--email' && argv[i+1]) { email = argv[i+1]; i++; }
  else if (argv[i] === '--id' && argv[i+1]) { id = argv[i+1]; i++; }
}

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI environment variable is required');
  process.exit(1);
}

async function toObjIdMaybe(v) {
  try {
    return new ObjectId(v);
  } catch (e) {
    return null;
  }
}

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(process.env.DB_NAME || 'feedbackPortal');

  // find student
  let student = null;
  if (id) {
    try { student = await db.collection('users').findOne({ _id: new ObjectId(id) }); } catch (e) { student = await db.collection('users').findOne({ _id: id }); }
  } else if (email) {
    student = await db.collection('users').findOne({ email });
    if (!student) student = await db.collection('users').findOne({ phone: email });
    // If still not found, try a broader search across common identifier fields and partial matches
    if (!student) {
      const orClauses = [
        { email: email },
        { phone: email },
        { admissionNo: email },
        { rollNumber: email },
        { enroll: email },
        { studentId: email },
        { registrationNumber: email },
        { username: email },
        { enrollment: email },
      ];
      // Also try searching string-containing matches for convenience
      const regex = new RegExp(email);
      const regexOr = [
        { email: { $regex: regex } },
        { phone: { $regex: regex } },
        { admissionNo: { $regex: regex } },
        { rollNumber: { $regex: regex } },
      ];
      const broader = await db.collection('users').find({ $or: [...orClauses, ...regexOr] }).limit(20).toArray();
      console.log('\nBroader user search results count:', broader.length);
      if (broader.length) console.log('Sample user from broader search:', broader[0]);
      // If exactly one result from broader search, use it as the student
      if (broader.length === 1) student = broader[0];
    }
  } else {
    console.error('Provide --email or --id');
    await client.close();
    process.exit(1);
  }

  console.log('STUDENT:', student ? {
    _id: student._id?.toString(),
    email: student.email,
    departmentId: student.departmentId,
    academicYearId: student.academicYearId,
  } : null);

  if (!student) { await client.close(); process.exit(1); }

  // Build departmentId query values
  const depIdStr = String(student.departmentId);
  const depObj = await toObjIdMaybe(student.departmentId);
  const departmentIdQueryValues = [depIdStr];
  if (depObj) departmentIdQueryValues.push(depObj);

  console.log('\nDepartment ID query values:');
  console.log(departmentIdQueryValues.map(v => ({ val: String(v), type: (v instanceof ObjectId) ? 'ObjectId' : typeof v })));

  // Find departmentSubjects rows by $in
  const depSubLinks = await db.collection('departmentSubjects').find({ departmentId: { $in: departmentIdQueryValues } }).toArray();
  console.log('\ndepartmentSubjects rows count:', depSubLinks.length);
  if (depSubLinks.length) console.log('sample row:', depSubLinks[0]);

  // Subject ids as strings
  const subjectIdsAsStrings = depSubLinks.map(r => r.subjectId).filter(Boolean);
  console.log('\nsubjectIdsAsStrings count:', subjectIdsAsStrings.length);
  console.log('sample subjectIdsAsStrings (first 10):', subjectIdsAsStrings.slice(0,10));

  const subjectIdObjIds = (await Promise.all(subjectIdsAsStrings.map(s => toObjIdMaybe(s)))).filter(Boolean);
  const subjectIdQueryValues = [...subjectIdsAsStrings, ...subjectIdObjIds];
  console.log('\nsubjectIdQueryValues sample (first 12):', subjectIdQueryValues.slice(0,12).map(v => ({ val: String(v), type: (v instanceof ObjectId) ? 'ObjectId' : typeof v })));

  // academicYear query values
  const ayStr = String(student.academicYearId);
  const ayObj = await toObjIdMaybe(student.academicYearId);
  const academicYearIdQueryValues = [ayStr]; if (ayObj) academicYearIdQueryValues.push(ayObj);
  console.log('\nacademicYearIdQueryValues:', academicYearIdQueryValues.map(v => ({ val: String(v), type: (v instanceof ObjectId) ? 'ObjectId' : typeof v })));

  // Query assignments by subject only
  const assignmentsBySubject = await db.collection('facultyAssignments').find({ subjectId: { $in: subjectIdQueryValues } }).toArray();
  console.log('\nAssignments matching subjectId $in subjectIdQueryValues: count =', assignmentsBySubject.length);
  if (assignmentsBySubject.length) console.log('sample assignment (subject-only):', assignmentsBySubject[0]);

  // Query assignments by academicYear only
  const assignmentsByAY = await db.collection('facultyAssignments').find({ academicYearId: { $in: academicYearIdQueryValues } }).toArray();
  console.log('\nAssignments matching academicYearId $in academicYearIdQueryValues: count =', assignmentsByAY.length);
  if (assignmentsByAY.length) console.log('sample assignment (ay-only):', assignmentsByAY[0]);

  // Intersection like the function: subjectId in AND academicYearId in
  const assignmentsBoth = await db.collection('facultyAssignments').find({ subjectId: { $in: subjectIdQueryValues }, academicYearId: { $in: academicYearIdQueryValues } }).toArray();
  console.log('\nAssignments matching BOTH subjectId and academicYearId: count =', assignmentsBoth.length);
  if (assignmentsBoth.length) console.log('sample assignment (both):', assignmentsBoth[0]);

  // Print types of a few assignment fields to inspect encoding
  if (assignmentsBoth.length) {
    const a = assignmentsBoth[0];
    console.log('\nSample assignment id types:');
    console.log('assignment._id type:', typeof a._id, 'instanceof ObjectId:', a._id instanceof ObjectId, 'string:', String(a._id));
    console.log('assignment.subjectId type:', typeof a.subjectId, 'instanceof ObjectId:', a.subjectId instanceof ObjectId, 'string:', String(a.subjectId));
    console.log('assignment.academicYearId type:', typeof a.academicYearId, 'instanceof ObjectId:', a.academicYearId instanceof ObjectId, 'string:', String(a.academicYearId));
    console.log('assignment.staffId type:', typeof a.staffId, 'instanceof ObjectId:', a.staffId instanceof ObjectId, 'string:', String(a.staffId));
  } else if (assignmentsBySubject.length) {
    const a = assignmentsBySubject[0];
    console.log('\nSample (subject-only) assignment id types:');
    console.log('assignment.subjectId type:', typeof a.subjectId, 'instanceof ObjectId:', a.subjectId instanceof ObjectId, 'string:', String(a.subjectId));
    console.log('assignment.academicYearId type:', typeof a.academicYearId, 'instanceof ObjectId:', a.academicYearId instanceof ObjectId, 'string:', String(a.academicYearId));
  }

  await client.close();
}

main().catch(err => { console.error(err); process.exit(1); });
