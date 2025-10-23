#!/usr/bin/env node
/**
 * Debug script for spiot-feedback-portal
 * - Dumps subjects, faculty assignments and staff for a given semester
 * - Detects duplicate assignments (same subjectId + staffId + semester)
 * - Lists assignments for subjects whose department differs from assigned staff department
 *
 * Usage:
 *   node scripts/debug-assignments.js --semester="Odd 2025-26"
 *   or set SEMESTER env: SEMESTER="Odd 2025-26" node scripts/debug-assignments.js
 */

const { MongoClient, ObjectId } = require('mongodb');
const argv = require('minimist')(process.argv.slice(2));

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('Please set MONGODB_URI in env');
  process.exit(1);
}

const SEMESTER = argv.semester || process.env.SEMESTER || 'Odd 2025-26';

async function main() {
  const client = new MongoClient(uri, { useUnifiedTopology: true });
  await client.connect();
  const db = client.db('feedbackPortal');

  console.log('Using semester:', SEMESTER);

  const subjects = await db.collection('subjects').find({}).toArray();
  const assignments = await db.collection('facultyAssignments').find({ semester: SEMESTER }).toArray();
  const staffDocs = await db.collection('staff').find({}).toArray();
  const users = await db.collection('users').find({}).toArray();
  const departments = await db.collection('departments').find({}).toArray();

  const subjById = new Map(subjects.map(s => [s._id.toString(), s]));
  const staffById = new Map(staffDocs.map(s => [s._id.toString(), s]));
  const deptById = new Map(departments.map(d => [d._id.toString(), d]));
  const userById = new Map(users.map(u => [u._id.toString(), u]));

  console.log('\nTotal subjects:', subjects.length);
  console.log('Assignments for semester', SEMESTER, ':', assignments.length);

  // Detect duplicates
  const keyCount = {};
  for (const a of assignments) {
    const key = `${a.subjectId || ''}::${a.staffId || ''}::${a.semester || ''}`;
    keyCount[key] = (keyCount[key] || 0) + 1;
  }
  const duplicates = Object.entries(keyCount).filter(([k, v]) => v > 1);
  console.log('\nDuplicate assignment groups (subjectId::staffId::semester) >1:');
  if (duplicates.length === 0) console.log('  None');
  for (const [k, v] of duplicates) console.log(`  ${k} -> ${v}`);

  // Find assignments where subject.departmentId exists and staff.departmentId differs
  const mismatched = [];
  for (const a of assignments) {
    const sid = a.subjectId;
    const staffId = a.staffId;
    const subject = sid ? subjById.get(sid.toString ? sid.toString() : sid) : null;
    const staff = staffId ? staffById.get(staffId.toString ? staffId.toString() : staffId) : null;
    const subjDept = subject?.departmentId ? (subject.departmentId.toString ? subject.departmentId.toString() : subject.departmentId) : null;
    const staffDept = staff?.departmentId ? (staff.departmentId.toString ? staff.departmentId.toString() : staff.departmentId) : null;
    if (subjDept && staffDept && subjDept !== staffDept) {
      mismatched.push({ assignment: a, subject, staff });
    }
  }

  console.log('\nAssignments where subject.departmentId != staff.departmentId:');
  if (mismatched.length === 0) console.log('  None');
  for (const m of mismatched) {
    const sname = m.subject?.name || '(subject missing)';
    const staffRec = m.staff ? (`staffId=${m.staff._id.toString()} userId=${m.staff.userId}`) : '(staff missing)';
    const subjDeptName = m.subject?.departmentId ? (deptById.get(m.subject.departmentId.toString())?.abbreviation || m.subject.departmentId) : '(no dept)';
    const staffDeptName = m.staff?.departmentId ? (deptById.get(m.staff.departmentId.toString())?.abbreviation || m.staff.departmentId) : '(no dept)';
    console.log(`  Subject: ${sname} [dept=${subjDeptName}]  |  ${staffRec} [staffDept=${staffDeptName}]  | assignmentId=${m.assignment._id.toString()}`);
  }

  // List subjects with no assignments in this semester
  const assignedSubjectIds = new Set(assignments.map(a => a.subjectId && (a.subjectId.toString ? a.subjectId.toString() : a.subjectId)));
  const unassignedSubjects = subjects.filter(s => !assignedSubjectIds.has(s._id.toString()));
  console.log('\nSubjects with NO assignments for semester', SEMESTER, ':', unassignedSubjects.length);
  for (const s of unassignedSubjects.slice(0, 50)) {
    const dept = s.departmentId ? (deptById.get(s.departmentId.toString())?.abbreviation || s.departmentId) : '(no dept)';
    console.log(`  ${s.name} (${s.subjectCode || ''}) - dept=${dept} - id=${s._id.toString()}`);
  }

  await client.close();
}

main().catch(err => { console.error(err); process.exit(1); });
