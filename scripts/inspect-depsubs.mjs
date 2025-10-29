#!/usr/bin/env node
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://swapnilsonawane:TVDFjnMt9C97ieJO@cluster0.wqnku0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(process.env.DB_NAME || 'feedbackPortal');

  const studentDep = '68f6390b641c7bcb2781b39d';
  const studentAY = '68fc86be99ba276515402d22';

  const depSubs = await db.collection('departmentSubjects').find({ departmentId: studentDep }).toArray();
  console.log('departmentSubjects total', depSubs.length);
  for (const r of depSubs) {
    const subj = await db.collection('subjects').findOne({ _id: r.subjectId instanceof Object ? r.subjectId : r.subjectId });
    console.log('row _id:', String(r._id), 'junctionAY:', r.academicYearId, 'subjectId:', String(r.subjectId), 'subject.masterAY:', subj?.academicYearId);
  }

  await client.close();
}

main().catch(err => { console.error(err); process.exit(1); });
