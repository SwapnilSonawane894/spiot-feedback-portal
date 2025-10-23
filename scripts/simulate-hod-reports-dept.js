#!/usr/bin/env node
const { MongoClient, ObjectId } = require('mongodb');
const argv = require('minimist')(process.argv.slice(2));

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('Please set MONGODB_URI in env');
  process.exit(1);
}

const deptAbbrev = argv.dept || process.env.DEPT || 'CO';

async function normalizeSemester(s) {
  if (s === undefined || s === null) return s;
  const str = String(s).trim();
  const m = str.match(/(Odd|Even)\s*(?:Semester)?\s*(\d{4}(?:-|–)\d{2})/i);
  if (m) {
    const type = m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase();
    return `${type} Semester ${m[2]}`;
  }
  return str;
}

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('feedbackPortal');

  const dept = await db.collection('departments').findOne({ abbreviation: deptAbbrev });
  if (!dept) {
    console.error('Department not found for', deptAbbrev);
    process.exit(1);
  }

  const deptId = dept._id;
  const subjects = await db.collection('subjects').find({ departmentId: deptId }).toArray();
  const deptSubjectIds = new Set(subjects.map(s => s._id.toString()));

  const allAssignments = await db.collection('facultyAssignments').find({}).toArray();

  // Collect assigned staff ids for these subjects
  const assignedStaffIds = new Set();
  for (const a of allAssignments) {
    const subjId = a.subjectId ? (a.subjectId.toString ? a.subjectId.toString() : a.subjectId) : null;
    const st = a.staffId ? (a.staffId.toString ? a.staffId.toString() : a.staffId) : null;
    if (subjId && deptSubjectIds.has(subjId) && st) assignedStaffIds.add(st);
  }

  // Dept staff
  const deptStaff = await db.collection('staff').find({ departmentId: deptId }).toArray();
  const deptStaffIds = new Set(deptStaff.map(s => s._id.toString()));

  const extraStaffIds = Array.from(assignedStaffIds).filter(id => !deptStaffIds.has(id));
  const extraStaff = extraStaffIds.length ? await db.collection('staff').find({ _id: { $in: extraStaffIds.map(id => new ObjectId(id)) } }).toArray() : [];

  // Merge staff list
  const staffList = [...deptStaff, ...extraStaff];

  console.log(`Department ${deptAbbrev} subjects: ${subjects.length}`);
  console.log(`Dept staff: ${deptStaff.length}, Extra assigned staff: ${extraStaff.length}, Total staff to report: ${staffList.length}`);

  for (const s of staffList) {
    const user = await db.collection('users').findOne({ _id: new ObjectId(s.userId) });
    const assignments = await db.collection('facultyAssignments').find({ staffId: s._id }).toArray();
    const relevant = assignments.filter(a => {
      const subjId = a.subjectId ? (a.subjectId.toString ? a.subjectId.toString() : a.subjectId) : null;
      return subjId && deptSubjectIds.has(subjId);
    });
    const subjNames = await Promise.all(relevant.map(async (a) => {
      const subj = await db.collection('subjects').findOne({ _id: new ObjectId(a.subjectId) });
      return subj ? `${subj.name} (${a.semester ? await normalizeSemester(a.semester) : 'N/A'})` : `missing-subject-${a.subjectId}`;
    }));

    console.log('\n---');
    console.log(`staffId=${s._id.toString()} userId=${s.userId} dept=${s.departmentId}`);
    console.log(`name=${user ? user.name || user.email : 'Unknown'}`);
    console.log('assigned subjects count:', subjNames.length);
    subjNames.forEach(sn => console.log('  ', sn));
  }

  await client.close();
}

main().catch(err => { console.error(err); process.exit(1); });
