#!/usr/bin/env node
const { MongoClient, ObjectId } = require('mongodb');
const argv = require('minimist')(process.argv.slice(2));

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('Please set MONGODB_URI in env');
  process.exit(1);
}

const deptAbbrev = argv.dept || process.env.DEPT || 'CO';

function idType(v) {
  if (v === undefined || v === null) return 'null';
  if (typeof v === 'string') return 'string';
  if (v && v._bsontype === 'ObjectID') return 'ObjectId';
  if (v && v instanceof ObjectId) return 'ObjectId';
  return typeof v;
}

async function normalizeSemester(s) {
  if (s === undefined || s === null) return s;
  const str = String(s).trim();
  const m = str.match(/(Odd|Even)\s*(?:Semester)?\s*(\d{4}(?:-|–)\d{2})/i);
  if (m) {
    const type = m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase();
    return `${type} Semester ${m[2]}`;
  }
  return str;
}

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('feedbackPortal');

  const dept = await db.collection('departments').findOne({ abbreviation: deptAbbrev });
  if (!dept) {
    console.error('Department not found for', deptAbbrev);
    process.exit(1);
  }
  console.log('Department:', deptAbbrev, 'id=', dept._id.toString());

  const subjects = await db.collection('subjects').find({}).toArray();
  const subjectsById = new Map(subjects.map(s => [s._id.toString(), s]));
  const subjectsInDept = subjects.filter(s => {
    const sid = s.departmentId;
    if (!sid) return false;
    const t = idType(s.departmentId);
    if (t === 'ObjectId') return String(s.departmentId) === String(dept._id);
    return String(s.departmentId) === dept._id.toString();
  });

  const staff = await db.collection('staff').find({}).toArray();
  const staffById = new Map(staff.map(s => [s._id.toString(), s]));

  const assignments = await db.collection('facultyAssignments').find({}).toArray();

  console.log('\nCollections counts:');
  console.log('  subjects:', subjects.length);
  console.log('  staff:', staff.length);
  console.log('  assignments:', assignments.length);

  // Semester variants
  const semesters = new Map();
  for (const a of assignments) {
    const raw = a.semester;
    const norm = normalizeSemester(raw);
    semesters.set(raw === undefined ? 'undefined' : String(raw), (semesters.get(String(raw)) || 0) + 1);
    if (String(raw) !== norm) {
      semesters.set(norm, (semesters.get(norm) || 0)); // ensure present
    }
  }
  console.log('\nDistinct semester raw values and counts (sample up to 50):');
  let i = 0;
  for (const [k, v] of semesters.entries()) {
    console.log(`  ${k} -> ${v}`);
    if (++i > 50) break;
  }

  // Find assignments for dept subjects
  const subjIds = new Set(subjectsInDept.map(s => s._id.toString()));
  const assignmentsForDept = assignments.filter(a => {
    const sid = a.subjectId ? (a.subjectId.toString ? a.subjectId.toString() : String(a.subjectId)) : null;
    return sid && subjIds.has(sid);
  });

  console.log(`\nSubjects in ${deptAbbrev}: ${subjectsInDept.length}`);
  console.log(`Assignments pointing to these subjects: ${assignmentsForDept.length}`);

  // Find mismatches and types
  const mismatches = [];
  const typeIssues = [];

  for (const a of assignmentsForDept) {
    const sidRaw = a.subjectId;
    const stRaw = a.staffId;
    const sid = sidRaw ? (sidRaw.toString ? sidRaw.toString() : String(sidRaw)) : null;
    const stid = stRaw ? (stRaw.toString ? stRaw.toString() : String(stRaw)) : null;
    const subj = subjectsById.get(sid);
    const staffRec = staffById.get(stid);
    const subjDept = subj?.departmentId ? (subj.departmentId.toString ? subj.departmentId.toString() : String(subj.departmentId)) : null;
    const staffDept = staffRec?.departmentId ? (staffRec.departmentId.toString ? staffRec.departmentId.toString() : String(staffRec.departmentId)) : null;

    if (subjDept && staffDept && subjDept !== staffDept) {
      mismatches.push({ assignmentId: a._id.toString(), subjectId: sid, staffId: stid, subjectDept: subjDept, staffDept });
    }

    // id type checks
    const subjIdType = idType(a.subjectId);
    const staffIdType = idType(a.staffId);
    if (subjIdType !== 'string' && subjIdType !== 'ObjectId') typeIssues.push({ assignmentId: a._id.toString(), field: 'subjectId', type: subjIdType });
    if (staffIdType !== 'string' && staffIdType !== 'ObjectId') typeIssues.push({ assignmentId: a._id.toString(), field: 'staffId', type: staffIdType });
  }

  console.log('\nAssignments where subject.departmentId != staff.departmentId (sample up to 50):');
  if (mismatches.length === 0) console.log('  None');
  mismatches.slice(0, 50).forEach(m => console.log(`  assignmentId=${m.assignmentId} subjectDept=${m.subjectDept} staffDept=${m.staffDept} subjectId=${m.subjectId} staffId=${m.staffId}`));

  console.log(`\nType issues for id fields (count=${typeIssues.length}):`);
  typeIssues.slice(0, 50).forEach(t => console.log(`  assignment=${t.assignmentId} field=${t.field} type=${t.type}`));

  // Detect semester string variants for same staff+subject
  const groupMap = new Map();
  for (const a of assignmentsForDept) {
    const subj = a.subjectId ? (a.subjectId.toString ? a.subjectId.toString() : String(a.subjectId)) : '';
    const staffId = a.staffId ? (a.staffId.toString ? a.staffId.toString() : String(a.staffId)) : '';
    const key = `${staffId}::${subj}`;
    if (!groupMap.has(key)) groupMap.set(key, []);
    groupMap.get(key).push({ id: a._id.toString(), semesterRaw: a.semester, semesterNorm: normalizeSemester(a.semester) });
  }

  const variants = [];
  for (const [k, arr] of groupMap.entries()) {
    const norms = new Set(arr.map(x => x.semesterNorm));
    if (norms.size > 1) variants.push({ key: k, instances: arr });
  }

  console.log(`\nStaff+subject groups with >1 normalized semester variants: ${variants.length}`);
  variants.slice(0, 50).forEach(v => {
    console.log(`  group=${v.key}`);
    v.instances.forEach(i => console.log(`    ${i.id} raw='${i.semesterRaw}' norm='${i.semesterNorm}'`));
  });

  await client.close();
}

main().catch(err => { console.error(err); process.exit(1); });
