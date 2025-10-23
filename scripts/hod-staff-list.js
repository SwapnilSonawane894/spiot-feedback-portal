#!/usr/bin/env node
const { MongoClient, ObjectId } = require('mongodb');
const argv = require('minimist')(process.argv.slice(2));

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('Please set MONGODB_URI in env');
  process.exit(1);
}

const deptAbbrev = argv.dept || process.env.DEPT || 'CO';

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('feedbackPortal');

  const dept = await db.collection('departments').findOne({ abbreviation: deptAbbrev });
  if (!dept) {
    console.error('Department not found for', deptAbbrev);
    process.exit(1);
  }

  const deptId = dept._id.toString();

  const deptStaff = await db.collection('staff').find({ departmentId: dept._id }).toArray();
  const subjects = await db.collection('subjects').find({ departmentId: dept._id }).toArray();
  const subjectIds = new Set(subjects.map(s => s._id.toString()));

  const allAssignments = await db.collection('facultyAssignments').find({}).toArray();
  const assignedStaffIds = new Set();
  for (const a of allAssignments) {
    const sid = a.subjectId ? (a.subjectId.toString ? a.subjectId.toString() : a.subjectId) : null;
    const st = a.staffId ? (a.staffId.toString ? a.staffId.toString() : a.staffId) : null;
    if (sid && subjectIds.has(sid) && st) assignedStaffIds.add(st);
  }

  const deptStaffIds = new Set(deptStaff.map(s => s._id.toString()));
  const extraStaffIds = Array.from(assignedStaffIds).filter(id => !deptStaffIds.has(id));
  const extraStaff = extraStaffIds.length > 0 ? await db.collection('staff').find({ _id: { $in: extraStaffIds.map(id => new ObjectId(id)) } }).toArray() : [];

  console.log('Department:', deptAbbrev, 'id=', deptId);
  console.log('Dept staff count:', deptStaff.length);
  console.log('Subjects in dept:', subjects.length);
  console.log('Assignments total:', allAssignments.length);
  console.log('AssignedStaffIds for dept subjects:', assignedStaffIds.size);
  console.log('Extra staff (from other depts) count:', extraStaff.length);

  console.log('\nSample dept staff:');
  deptStaff.slice(0, 10).forEach(s => console.log(`  staffId=${s._id.toString()} userId=${s.userId} dept=${s.departmentId}`));

  console.log('\nSample extra staff:');
  extraStaff.slice(0, 20).forEach(s => console.log(`  staffId=${s._id.toString()} userId=${s.userId} dept=${s.departmentId}`));

  await client.close();
}

main().catch(err => { console.error(err); process.exit(1); });
