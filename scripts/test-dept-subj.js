#!/usr/bin/env node
const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'feedbackPortal';

(async function(){
  const client = new MongoClient(MONGO_URI, { useUnifiedTopology: true });
  try {
    await client.connect();
    const db = client.db(DB_NAME);

    const subjectCode = '315002';
    const subj = await db.collection('subjects').findOne({ subjectCode });
    if (!subj) {
      console.log('Subject not found for code', subjectCode);
      return process.exit(1);
    }
    const sid = String(subj._id);
    console.log('Found subject:', { id: sid, name: subj.name });

    const depts = await db.collection('departments').find({ abbreviation: { $in: ['CO','EE'] } }).toArray();
    console.log('Departments found:', depts.map(d => ({ id: String(d._id), abbr: d.abbreviation }))); 

    for (const d of depts) {
      const row = await db.collection('departmentSubjects').findOne({ subjectId: sid, departmentId: String(d._id) });
      console.log(`departmentSubjects for dept ${d.abbreviation} (${d._id}):`, !!row ? { id: String(row._id), academicYearId: row.academicYearId } : null);
    }

    // Also list all departmentSubjects rows for this subject
    const allRows = await db.collection('departmentSubjects').find({ subjectId: sid }).toArray();
    console.log('All departmentSubjects for this subject:', allRows.map(r => ({ id: String(r._id), departmentId: r.departmentId, academicYearId: r.academicYearId })));

    await client.close();
    process.exit(0);
  } catch (err) {
    console.error('Error in test script', err);
    try { await client.close(); } catch(e){}
    process.exit(2);
  }
})();
