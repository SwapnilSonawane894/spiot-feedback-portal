#!/usr/bin/env node
const { MongoClient, ObjectId } = require('mongodb');
const uri = process.env.MONGODB_URI;
if (!uri) { console.error('MONGODB_URI not set'); process.exit(1); }

(async ()=>{
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('feedbackPortal');

  console.log('--- Subjects duplicated by subjectCode ---');
  const dupByCode = await db.collection('subjects').aggregate([
    { $group: { _id: '$subjectCode', count: { $sum: 1 }, docs: { $push: { id: '$_id', name: '$name', academicYearId: '$academicYearId', departmentId: '$departmentId' } } } },
    { $match: { _id: { $ne: null }, count: { $gt: 1 } } },
  ]).toArray();
  console.log(JSON.stringify(dupByCode, null, 2));

  console.log('\n--- Subjects duplicated by name ---');
  const dupByName = await db.collection('subjects').aggregate([
    { $group: { _id: '$name', count: { $sum: 1 }, docs: { $push: { id: '$_id', subjectCode: '$subjectCode', academicYearId: '$academicYearId', departmentId: '$departmentId' } } } },
    { $match: { _id: { $ne: null }, count: { $gt: 1 } } },
  ]).toArray();
  console.log(JSON.stringify(dupByName, null, 2));

  console.log('\n--- Assignment groups by staffId::subjectId::semester with counts >1 ---');
  const dupAssign = await db.collection('facultyAssignments').aggregate([
    { $group: { _id: { staffId: '$staffId', subjectId: '$subjectId', semester: '$semester' }, count: { $sum: 1 }, docs: { $push: '$_id' } } },
    { $match: { count: { $gt: 1 } } }
  ]).toArray();
  console.log(JSON.stringify(dupAssign, null, 2));

  console.log('\n--- Assignments for sample subjects with subjectCode duplicates ---');
  for (const s of dupByCode) {
    console.log('SubjectCode:', s._id);
    for (const d of s.docs) {
      const subjId = d.id.$oid ? d.id.$oid : d.id; // depending on representation
      const assignments = await db.collection('facultyAssignments').find({ subjectId: subjId }).toArray();
      console.log('  subject id:', subjId, 'assignments count:', assignments.length);
      console.log('  assignment ids:', assignments.map(a=>a._id));
    }
  }

  console.log('\n--- List assignments per staff where staff has multiple assignments for same subjectCode ---');
  // Map subjectId -> subjectCode
  const subjects = await db.collection('subjects').find({}).toArray();
  const subjMap = new Map(subjects.map(s => [s._id.toString(), s]));
  const assignments = await db.collection('facultyAssignments').find({}).toArray();
  const report = {};
  for (const a of assignments) {
    const staffId = a.staffId ? String(a.staffId) : 'null';
    const subjectId = a.subjectId ? String(a.subjectId) : 'null';
    const subj = subjMap.get(subjectId);
    const code = subj ? subj.subjectCode || subj.name : 'unknown';
    const key = `${staffId}::${code}`;
    report[key] = report[key] || [];
    report[key].push({ assignmentId: String(a._id), semester: a.semester, subjectId });
  }

  const problematic = Object.entries(report).filter(([k, v]) => v.length > 1);
  console.log(JSON.stringify(problematic.slice(0,100), null, 2));

  await client.close();
})();
