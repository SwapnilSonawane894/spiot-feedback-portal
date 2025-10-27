#!/usr/bin/env node
/*
  migrate-add-department-subjects.js
  - Creates a new departmentSubjects collection to model many-to-many between departments and subjects
  - Infers department-subject pairs from facultyAssignments -> staff -> departments
  - Adds indexes and a composite unique constraint
  - Optionally drops unique index on subjects.subjectCode (requires confirmation)

  Usage:
    node migrate-add-department-subjects.js [--dry-run] [--drop-subjectcode-index]

  Notes:
    - This script prefers safety: it will prompt before destructive changes.
    - It batches writes and logs progress.
*/

const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');
const { MongoClient } = require('mongodb');

const DEFAULT_URI = process.env.MONGO_URI || 'mongodb+srv://swapnilsonawane:TVDFjnMt9C97ieJO@cluster0.wqnku0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = process.env.DB_NAME || 'feedbackPortal';
const BATCH_SIZE = 500;

async function confirm(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question + ' ', ans => { rl.close(); resolve(ans.match(/^y(es)?$/i)); }));
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const dropSubjectCode = args.includes('--drop-subjectcode-index');
  const autoYes = args.includes('--yes') || process.env.AUTO_YES === '1';
  // option: include subjects.departmentId as a source of pairs
  const includeSubjectsDept = args.includes('--include-subjects-dept') || true; // default true

  console.log(`Connect to ${DEFAULT_URI} (DB: ${DB_NAME})`);
  if (dryRun) console.log('Dry-run: no mutations will be performed');

  const client = new MongoClient(DEFAULT_URI, { connectTimeoutMS: 10000 });
  await client.connect();
  const db = client.db(DB_NAME);

  // Ensure staff and facultyAssignments and departments and subjects exist
  const staffColl = db.collection('staff');
  const faColl = db.collection('facultyAssignments');
  const deptColl = db.collection('departments');
  const subjColl = db.collection('subjects');
  const deptSubjName = 'departmentSubjects';
  const deptSubjColl = db.collection(deptSubjName);

  // 1) Read staff and build a map staffId -> departmentId
  console.log('Loading staff...');
  const staffDocs = await staffColl.find({}).project({ _id: 1, departmentId: 1 }).toArray();
  const staffToDept = new Map();
  for (const s of staffDocs) staffToDept.set(String(s._id), s.departmentId ? String(s.departmentId) : null);

  // 2) Load faculty assignments and infer pairs
  console.log('Loading faculty assignments...');
  const faCursor = faColl.find({}).project({ staffId: 1, subjectId: 1, academicYearId: 1 });
  const faPairs = new Set();
  let totalAssignments = 0;
  while (await faCursor.hasNext()) {
    const doc = await faCursor.next();
    totalAssignments++;
    const staffId = doc.staffId ? String(doc.staffId) : null;
    const deptId = staffToDept.get(staffId) || null;
    if (!deptId) continue; // skip assignments whose staff lacks department
    const subjectId = doc.subjectId ? String(doc.subjectId) : null;
    const ay = doc.academicYearId ? String(doc.academicYearId) : null;
    if (!subjectId) continue;
    faPairs.add(`${deptId}:::${subjectId}:::${ay}`);
  }

  console.log(`Inferred ${faPairs.size} unique (department,subject,academicYear) pairs from ${totalAssignments} assignments`);

  // 3) Optionally include pairs inferred from subjects.departmentId
  const subjPairs = new Set();
  if (includeSubjectsDept) {
    console.log('Loading subjects to include subjects.departmentId as source...');
    const subjCursor = subjColl.find({}).project({ _id: 1, departmentId: 1, academicYearId: 1 }).toArray();
    const subjDocs = await subjCursor;
    for (const s of subjDocs) {
      if (!s._id) continue;
      if (s.departmentId) {
        subjPairs.add(`${String(s.departmentId)}:::${String(s._id)}:::${s.academicYearId ? String(s.academicYearId) : null}`);
      }
    }
    console.log(`Found ${subjPairs.size} pairs from subjects.departmentId`);
  }

  // 4) Combine and deduplicate
  const combinedSet = new Set([...faPairs, ...subjPairs]);
  console.log(`Final deduplicated pairs to insert: ${combinedSet.size}`);

  if (combinedSet.size === 0) {
    console.log('No pairs inferred; aborting.');
    await client.close();
    return;
  }

  if (dryRun) {
    console.log('Dry-run sample (first 100):');
    let i = 0;
    for (const composite of combinedSet) {
      if (i++ >= 100) break;
      const [departmentId, subjectId, academicYearId] = composite.split(':::');
      console.log({ departmentId, subjectId, academicYearId });
    }
    console.log(`Dry-run counts: faPairs=${faPairs.size}, subjPairs=${subjPairs.size}, combined=${combinedSet.size}`);
    // list subjects with no department mapping
    const subjectsWithoutDept = [];
    const allSubjects = await subjColl.find({}).project({ _id: 1, name: 1, subjectCode: 1, departmentId: 1 }).toArray();
    for (const s of allSubjects) {
      const hasMapping = Array.from(combinedSet).some(c => c.includes(`:::${String(s._id)}:::`) || c.startsWith(`${s.departmentId}:::`));
      if (!hasMapping) subjectsWithoutDept.push({ _id: String(s._id), name: s.name, subjectCode: s.subjectCode });
      if (subjectsWithoutDept.length >= 50) break;
    }
    console.log(`Subjects without any department mapping (sample up to 50): ${subjectsWithoutDept.length}`);
    for (const s of subjectsWithoutDept) console.log(s);
    console.log('Dry-run complete. No changes were made.');
    await client.close();
    return;
  }

  // Create collection and indexes (these operations are not allowed inside a transaction)
  const exists = (await db.listCollections({ name: deptSubjName }).toArray()).length > 0;
  if (!exists) {
    console.log(`Creating collection ${deptSubjName}`);
    await db.createCollection(deptSubjName);
  } else {
    console.log(`${deptSubjName} already exists`);
  }

  console.log('Creating indexes on departmentSubjects');
  await deptSubjColl.createIndex({ departmentId: 1 });
  await deptSubjColl.createIndex({ subjectId: 1 });
  try {
    await deptSubjColl.createIndex({ departmentId: 1, subjectId: 1 }, { unique: true, name: 'uniq_dept_subject' });
    console.log('Created composite unique index uniq_dept_subject');
  } catch (err) {
    console.warn('Could not create unique composite index (it may already exist):', err.message);
  }

  // Prepare documents to insert
  const toInsert = [];
  const now = new Date();
  for (const composite of combinedSet) {
    const [departmentId, subjectId, academicYearId] = composite.split(':::');
    toInsert.push({ departmentId, subjectId, academicYearId: academicYearId || null, createdAt: now, updatedAt: now });
  }

  console.log(`Inserting ${toInsert.length} documents into ${deptSubjName} in batches of ${BATCH_SIZE}`);
  for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
    const batch = toInsert.slice(i, i + BATCH_SIZE);
    try {
      await deptSubjColl.insertMany(batch, { ordered: false });
    } catch (err) {
      // ignore duplicate key errors and log
      if (err.code === 11000) {
        console.warn('Duplicate key error on batch insert; some pairs already existed. Continuing.');
      } else {
        console.error('Error inserting batch:', err);
        throw err;
      }
    }
    console.log(`  inserted batch ${Math.floor(i / BATCH_SIZE) + 1}`);
  }

  // Optionally drop unique constraint on subjects.subjectCode
  const subjectIndexes = await subjColl.indexes();
  const uniqueSubjectCodeIndex = subjectIndexes.find(ix => ix.unique && ix.key && ix.key.subjectCode);
  if (uniqueSubjectCodeIndex) {
    console.log('subjects collection has a unique index on subjectCode:', uniqueSubjectCodeIndex.name);
    if (dropSubjectCode) {
      const ok = await confirm(`Are you SURE you want to drop index ${uniqueSubjectCodeIndex.name} on subjects.subjectCode? This is destructive. Type 'yes' to proceed.`);
        // allow auto-yes flag to skip interactive prompt
        let okFinal = ok;
        if (autoYes) okFinal = true;
        if (okFinal) {
          console.log('Dropping index', uniqueSubjectCodeIndex.name);
          await subjColl.dropIndex(uniqueSubjectCodeIndex.name);
          console.log('Dropped unique index on subjectCode');
        } else {
          console.log('Skipping drop of unique index on subjectCode');
        }
    } else {
      console.log('Not dropping subjectCode unique index (pass --drop-subjectcode-index to enable)');
    }
  } else {
    console.log('No unique index on subjects.subjectCode found');
  }

  console.log('Migration completed successfully');
  await client.close();
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(3);
});
