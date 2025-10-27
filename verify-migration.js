#!/usr/bin/env node
/*
  verify-migration.js
  - Performs post-migration checks
  - Verifies counts and referential integrity between facultyAssignments->staff->departments and departmentSubjects

  Usage: node verify-migration.js
*/

const { MongoClient } = require('mongodb');

const DEFAULT_URI = process.env.MONGO_URI || 'mongodb+srv://swapnilsonawane:TVDFjnMt9C97ieJO@cluster0.wqnku0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = process.env.DB_NAME || 'feedbackPortal';

async function main() {
  const client = new MongoClient(DEFAULT_URI, { connectTimeoutMS: 10000 });
  await client.connect();
  const db = client.db(DB_NAME);

  const faColl = db.collection('facultyAssignments');
  const staffColl = db.collection('staff');
  const deptSubjColl = db.collection('departmentSubjects');

  // 1) Count unique inferred pairs
  console.log('Computing inferred pairs from facultyAssignments -> staff...');
  const staffDocs = await staffColl.find({}).project({ _id: 1, departmentId: 1 }).toArray();
  const staffToDept = new Map();
  for (const s of staffDocs) staffToDept.set(String(s._id), s.departmentId ? String(s.departmentId) : null);

  const faCursor = faColl.find({}).project({ staffId: 1, subjectId: 1, academicYearId: 1 });
  const inferredPairs = new Set();
  while (await faCursor.hasNext()) {
    const d = await faCursor.next();
    const dept = staffToDept.get(String(d.staffId)) || null;
    if (!dept || !d.subjectId) continue;
    inferredPairs.add(`${dept}:::${String(d.subjectId)}:::${d.academicYearId ? String(d.academicYearId) : ''}`);
  }

  const inferredCount = inferredPairs.size;
  const deptSubjCount = await deptSubjColl.countDocuments();
  console.log(`Inferred unique pairs: ${inferredCount}`);
  console.log(`departmentSubjects documents: ${deptSubjCount}`);

  // 2) Sample-check referential integrity for a few assignments
  console.log('Sample-checking 50 assignments for existence in departmentSubjects...');
  const sample = await faColl.find({}).limit(50).toArray();
  let missing = 0;
  for (const s of sample) {
    const staff = await staffColl.findOne({ _id: s.staffId });
    if (!staff || !staff.departmentId) continue;
    const subjectId = s.subjectId;
    const match = await deptSubjColl.findOne({ departmentId: String(staff.departmentId), subjectId: String(subjectId) });
    if (!match) missing++;
  }
  console.log(`Missing departmentSubjects entries in sample: ${missing}`);

  // 3) Check for duplicate composite keys (should not exist if unique index created)
  console.log('Checking for duplicate departmentId+subjectId pairs...');
  const dupPipeline = [
    { $group: { _id: { departmentId: '$departmentId', subjectId: '$subjectId' }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
    { $limit: 10 }
  ];
  const dups = await deptSubjColl.aggregate(dupPipeline).toArray();
  if (dups.length) {
    console.warn('Found duplicate department+subject pairs:', dups.slice(0, 5));
  } else {
    console.log('No duplicate department+subject pairs found (sample check)');
  }

  await client.close();
}

main().catch(err => {
  console.error('Verification failed:', err);
  process.exit(5);
});
