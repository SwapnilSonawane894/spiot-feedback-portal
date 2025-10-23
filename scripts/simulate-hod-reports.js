#!/usr/bin/env node
const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('Please set MONGODB_URI in env');
  process.exit(1);
}

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('feedbackPortal');

  // Find any user with role 'HOD'
  const hodUser = await db.collection('users').findOne({ role: 'HOD' });
  if (!hodUser) {
    console.error('No HOD user found in users collection');
    process.exit(1);
  }
  console.log('Using HOD user:', hodUser.email || hodUser._id.toString());

  const staffRec = await db.collection('staff').findOne({ userId: hodUser._id });
  if (!staffRec) {
    console.error('No staff record for HOD user');
    process.exit(1);
  }
  const departmentId = staffRec.departmentId ? (staffRec.departmentId.toString ? staffRec.departmentId.toString() : staffRec.departmentId) : null;
  console.log('HOD staffId:', staffRec._id.toString(), 'departmentId:', departmentId);

  // subjects for department
  const subjects = await db.collection('subjects').find({ departmentId: new ObjectId(departmentId) }).toArray();
  const deptSubjectIds = new Set(subjects.map(s => s._id.toString()));

  const allAssignments = await db.collection('facultyAssignments').find({}).toArray();
  const assignedStaffIds = new Set();
  for (const a of allAssignments) {
    const subjId = a.subjectId ? (a.subjectId.toString ? a.subjectId.toString() : a.subjectId) : null;
    const st = a.staffId ? (a.staffId.toString ? a.staffId.toString() : a.staffId) : null;
    if (subjId && deptSubjectIds.has(subjId) && st) assignedStaffIds.add(st);
  }

  // dept staff
  const deptStaff = await db.collection('staff').find({ departmentId: new ObjectId(departmentId) }).toArray();
  const deptStaffIds = new Set(deptStaff.map(s => s._id.toString()));

  // extra staff ids
  const extraStaffIds = Array.from(assignedStaffIds).filter(id => !deptStaffIds.has(id));

  console.log('Subjects in dept:', subjects.length);
  console.log('Assignments total:', allAssignments.length);
  console.log('Dept staff count:', deptStaff.length);
  console.log('Assigned staff for dept subjects:', assignedStaffIds.size);
  console.log('Extra staff count:', extraStaffIds.length);

  // print a few extra staff with their departments
  const extraStaff = extraStaffIds.length ? await db.collection('staff').find({ _id: { $in: extraStaffIds.map(id => new ObjectId(id)) } }).toArray() : [];
  for (const s of extraStaff) {
    console.log(`extra staff: ${s._id.toString()} userId=${s.userId} dept=${s.departmentId}`);
  }

  await client.close();
}

main().catch(err => { console.error(err); process.exit(1); });
