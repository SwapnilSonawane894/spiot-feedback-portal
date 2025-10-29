#!/usr/bin/env node
/**
 * Lists assignments grouped by subject for a department and semester.
 * Helps confirm whether UI "duplicates" are actually multiple staff assigned to the same subject.
 * Usage (examples):
 * MONGODB_URI="..." DB_NAME="feedbackPortal" DEPARTMENT_ID="68f6390b641c7bcb2781b39c" SEMESTER="Odd 2025-26" node scripts/list-assignments-by-subject.js
 */

const { MongoClient, ObjectId } = require('mongodb');
const fs = require('fs');
const path = require('path');

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'feedbackPortal';
const DEPARTMENT_ID = process.env.DEPARTMENT_ID; // optional
const SEMESTER = process.env.SEMESTER; // optional

if (!MONGODB_URI) {
  console.error('Please set MONGODB_URI environment variable');
  process.exit(1);
}

function normalizeSemesterForCompare(s) {
  if (!s) return '';
  return String(s).replace(/\bSemester\b/ig, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

async function main() {
  const client = new MongoClient(MONGODB_URI, { maxPoolSize: 5 });
  await client.connect();
  const db = client.db(DB_NAME);

  const assignmentsColl = db.collection('facultyAssignments');
  const staffColl = db.collection('staff');
  const subjectsColl = db.collection('subjects');

  const filter = {};
  if (DEPARTMENT_ID) filter.departmentId = String(DEPARTMENT_ID);
  if (SEMESTER) filter.semester = SEMESTER;

  console.log('Query filter:', filter);

  const assignments = await assignmentsColl.find(filter).toArray();
  console.log('Assignments fetched:', assignments.length);

  if (assignments.length === 0) {
    console.log('No assignments matching filter. Try without SEMESTER or with a different DEPARTMENT_ID.');
    await client.close();
    return;
  }

  const subjectIds = Array.from(new Set(assignments.map(a => String(a.subjectId)).filter(Boolean)));
  const staffIds = Array.from(new Set(assignments.map(a => String(a.staffId)).filter(Boolean)));

  const subjectDocs = subjectIds.length ? await subjectsColl.find({ _id: { $in: subjectIds.map(id => { try { return new ObjectId(id) } catch { return id } }) } }).toArray() : [];
  const staffDocs = staffIds.length ? await staffColl.find({ _id: { $in: staffIds.map(id => { try { return new ObjectId(id) } catch { return id } }) } }).toArray() : [];

  const subjectMap = new Map(subjectDocs.map(s => [String(s._id || s.id), s]));
  const staffMap = new Map(staffDocs.map(s => [String(s._id || s.id), s]));

  const groups = new Map();
  for (const a of assignments) {
    const sid = String(a.subjectId);
    const list = groups.get(sid) || [];
    list.push(a);
    groups.set(sid, list);
  }

  const rows = [];
  for (const [sid, list] of groups.entries()) {
    const subj = subjectMap.get(sid) || { name: '(unknown)' };
    const staffNames = list.map(a => {
      const s = staffMap.get(String(a.staffId));
      return (s && (s.name || `${s.firstName || ''} ${s.lastName || ''}`)) || String(a.staffId);
    });
    rows.push({ subjectId: sid, subjectName: subj.name || subj.subjectCode || '(unknown)', count: list.length, staffNames, assignmentIds: list.map(a => (a._id ? String(a._id) : a.id)) });
  }

  // Sort by count desc then subjectName
  rows.sort((a, b) => b.count - a.count || (a.subjectName || '').localeCompare(b.subjectName || ''));

  console.log('\nAssignments grouped by subject (count > 0):\n');
  for (const r of rows) {
    console.log(`- ${r.subjectName} (${r.subjectId}): ${r.count} assignment(s)`);
    console.log(`  Staff: ${r.staffNames.join(' | ')}`);
    console.log(`  Assignment IDs: ${r.assignmentIds.join(', ')}`);
  }

  // CSV export
  const csvLines = ['subjectId,subjectName,count,staffNames,assignmentIds'];
  for (const r of rows) {
    csvLines.push([r.subjectId, `"${(r.subjectName || '').replace(/"/g, '""') }"`, r.count, `"${r.staffNames.join('|').replace(/"/g, '""') }"`, `"${r.assignmentIds.join('|')}"`].join(','));
  }
  const outPath = path.resolve(process.cwd(), 'assignments_by_subject.csv');
  fs.writeFileSync(outPath, csvLines.join('\n'));
  console.log('\nWrote', outPath);

  await client.close();
}

main().catch(err => { console.error('Error:', err); process.exit(1); });
