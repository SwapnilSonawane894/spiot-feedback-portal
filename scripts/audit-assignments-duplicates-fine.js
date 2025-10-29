#!/usr/bin/env node
/**
 * Audit facultyAssignments for exact duplicate groups by (staffId, subjectId, semester, academicYearId).
 * Usage:
 * MONGODB_URI="..." DB_NAME="feedbackPortal" DEPARTMENT_ID="68f6390b641c7bcb2781b39c" node scripts/audit-assignments-duplicates-fine.js
 */

const { MongoClient, ObjectId } = require('mongodb');
const fs = require('fs');
const path = require('path');

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'feedbackPortal';
const DEPARTMENT_ID = process.env.DEPARTMENT_ID; // optional

if (!MONGODB_URI) {
  console.error('Please set MONGODB_URI environment variable');
  process.exit(1);
}

async function main() {
  const client = new MongoClient(MONGODB_URI, { maxPoolSize: 5 });
  await client.connect();
  const db = client.db(DB_NAME);

  const filter = {};
  if (DEPARTMENT_ID) filter.departmentId = String(DEPARTMENT_ID);

  console.log('Query filter:', filter);

  const assignments = await db.collection('facultyAssignments').find(filter).toArray();
  console.log('Assignments fetched:', assignments.length);

  const groups = new Map();
  for (const a of assignments) {
    const staffId = a.staffId ? String(a.staffId) : '(null)';
    const subjectId = a.subjectId ? String(a.subjectId) : '(null)';
    const semester = a.semester ? String(a.semester) : '(null)';
    const ay = a.academicYearId ? String(a.academicYearId) : '(null)';
    const key = `${staffId}|${subjectId}|${semester}|${ay}`;
    const list = groups.get(key) || [];
    list.push({ id: a._id ? String(a._id) : a.id, staffId, subjectId, semester, academicYearId: ay, createdAt: a.createdAt || a._docCreatedAt || null });
    groups.set(key, list);
  }

  const duplicateGroups = [];
  for (const [key, list] of groups.entries()) {
    if (list.length > 1) duplicateGroups.push({ key, list });
  }

  console.log('\nDuplicate groups (by staffId|subjectId|semester|academicYearId):', duplicateGroups.length);

  const rows = [];
  for (const g of duplicateGroups) {
    const [staffId, subjectId, semester, ay] = g.key.split('|');
    console.log(`\nGroup: staff=${staffId} subject=${subjectId} semester=${semester} ay=${ay} -> ${g.list.length} docs`);
    for (const item of g.list) {
      console.log(`  - id=${item.id} createdAt=${item.createdAt}`);
      rows.push([staffId, subjectId, semester, ay, item.id, item.createdAt || ''].join(','));
    }
  }

  const outPath = path.resolve(process.cwd(), 'duplicate_assignment_groups.csv');
  if (rows.length) {
    fs.writeFileSync(outPath, 'staffId,subjectId,semester,academicYearId,assignmentId,createdAt\n' + rows.join('\n'));
    console.log('\nWrote', outPath);
  } else {
    console.log('\nNo exact duplicate groups found for given filter.');
  }

  await client.close();
}

main().catch(err => { console.error('Error:', err); process.exit(1); });
