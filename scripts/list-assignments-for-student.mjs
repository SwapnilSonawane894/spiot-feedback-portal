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
  const subjIds = depSubs.map(r => String(r.subjectId));
  console.log('depSubs total', depSubs.length);

  const assignmentsBySubject = await db.collection('facultyAssignments').find({ subjectId: { $in: subjIds } }).toArray();
  console.log('assignBySub count', assignmentsBySubject.length);
  assignmentsBySubject.forEach(a => console.log('SUBONLY', String(a._id), String(a.subjectId), String(a.academicYearId)));

  const assignmentsBoth = await db.collection('facultyAssignments').find({ subjectId: { $in: subjIds }, academicYearId: studentAY }).toArray();
  console.log('assignBoth count', assignmentsBoth.length);
  assignmentsBoth.forEach(a => console.log('BOTH', String(a._id), String(a.subjectId), String(a.academicYearId)));

  await client.close();
}

main().catch(err => { console.error(err); process.exit(1); });
