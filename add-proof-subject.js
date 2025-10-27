#!/usr/bin/env node
/*
  add-proof-subject.js
  - Finds or creates subject with subjectCode '315002'
  - Finds department IDs for abbreviations 'CO' and 'EE'
  - Inserts two documents into departmentSubjects linking the subject to both departments
  - Prints the inserted/existing departmentSubjects for that subject

  Usage:
    MONGO_URI="..." DB_NAME="feedbackPortal" node add-proof-subject.js
*/

const { MongoClient } = require('mongodb');

const DEFAULT_URI = process.env.MONGO_URI || 'mongodb+srv://swapnilsonawane:TVDFjnMt9C97ieJO@cluster0.wqnku0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = process.env.DB_NAME || 'feedbackPortal';

async function main() {
  const client = new MongoClient(DEFAULT_URI, { connectTimeoutMS: 10000 });
  await client.connect();
  const db = client.db(DB_NAME);

  const subjects = db.collection('subjects');
  const departments = db.collection('departments');
  const deptSubj = db.collection('departmentSubjects');

  try {
    console.log(`Connected to ${DEFAULT_URI} (DB: ${DB_NAME})`);

    // 1) Find subject by subjectCode
    const subjectCode = '315002';
    let subject = await subjects.findOne({ subjectCode });
    if (subject) {
      console.log('Found existing subject:', { _id: String(subject._id), name: subject.name, subjectCode: subject.subjectCode });
    } else {
      const now = new Date();
      const newSub = { name: 'Entrepreneurship Development And Startups 315002', subjectCode, academicYearId: null, createdAt: now, updatedAt: now };
      const res = await subjects.insertOne(newSub);
      subject = Object.assign({ _id: res.insertedId }, newSub);
      console.log('Created new subject:', { _id: String(subject._id), name: subject.name, subjectCode: subject.subjectCode });
    }

    // 2) Find departments CO and EE
    const depts = await departments.find({ abbreviation: { $in: ['CO', 'EE'] } }).toArray();
    const map = {};
    for (const d of depts) map[d.abbreviation] = d;
    if (!map.CO || !map.EE) {
      console.error('Could not find both CO and EE departments. Found:', depts.map(d => ({ abbreviation: d.abbreviation, _id: String(d._id) })));
      process.exit(2);
    }
    console.log('Departments found:', { CO: String(map.CO._id), EE: String(map.EE._id) });

    // 3) Ensure departmentSubjects collection exists
    const collExists = (await db.listCollections({ name: 'departmentSubjects' }).toArray()).length > 0;
    if (!collExists) {
      console.log('Creating departmentSubjects collection');
      await db.createCollection('departmentSubjects');
      await deptSubj.createIndex({ departmentId: 1, subjectId: 1 }, { unique: true, name: 'uniq_dept_subject' });
    }

    // 4) Insert two departmentSubjects documents (unordered, ignore duplicates)
    const now = new Date();
    const docs = [
      { departmentId: String(map.CO._id), subjectId: String(subject._id), academicYearId: null, createdAt: now, updatedAt: now },
      { departmentId: String(map.EE._id), subjectId: String(subject._id), academicYearId: null, createdAt: now, updatedAt: now },
    ];
    try {
      const res = await deptSubj.insertMany(docs, { ordered: false });
      console.log('Inserted departmentSubjects:', res.insertedCount);
    } catch (err) {
      if (err.code === 11000) {
        console.warn('Duplicates encountered while inserting departmentSubjects; some entries likely already existed.');
      } else {
        throw err;
      }
    }

    // 5) Query departmentSubjects for this subject
    const rows = await deptSubj.find({ subjectId: String(subject._id) }).toArray();
    console.log(`departmentSubjects entries for subject ${subject.subjectCode} (${String(subject._id)}):`);
    for (const r of rows) console.log(r);

    await client.close();
    console.log('Done.');
  } catch (err) {
    console.error('Operation failed:', err);
    await client.close();
    process.exit(3);
  }
}

main();
