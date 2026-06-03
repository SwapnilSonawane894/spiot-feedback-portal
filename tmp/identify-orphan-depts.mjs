/**
 * Definitively identify which department each orphaned assignmentId belongs to
 * by examining the students who submitted feedback for them.
 */
import { MongoClient, ObjectId } from 'mongodb';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '..', '.env') });

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const db = client.db('FeedbackPortal2');

// Step 1: find ALL orphaned assignment IDs across entire feedback collection
const allAssigns = await db.collection('facultyAssignments').find({}, { projection: { _id: 1 } }).toArray();
const existingIds = new Set(allAssigns.map(a => String(a._id)));

const pipeline = [
  { $group: { _id: '$assignmentId', count: { $sum: 1 }, students: { $addToSet: '$studentId' } } },
  { $sort: { count: -1 } }
];
const grouped = await db.collection('feedback').aggregate(pipeline).toArray();
const orphans = grouped.filter(g => !existingIds.has(g._id));
console.log(`Total orphaned assignmentIds: ${orphans.length}\n`);

// Load all departments
const departments = await db.collection('departments').find({}).toArray();
const deptMap = new Map(departments.map(d => [String(d._id), d.name || d.code || String(d._id)]));

// Load all students with their departmentId
const allStudents = await db.collection('users').find({ role: 'STUDENT' }, {
  projection: { _id: 1, departmentId: 1, name: 1, academicYearId: 1 }
}).toArray();
const studentMap = new Map(allStudents.map(s => [String(s._id), s]));

// Load all academicYears
const allYears = await db.collection('academicYears').find({}).toArray();
const yearMap = new Map(allYears.map(y => [String(y._id), y.name || y.year || y.label || String(y._id)]));

console.log('═══════════════════════════════════════════════════════════════');
console.log('ORPHANED ASSIGNMENT ANALYSIS — Department + AcademicYear breakdown');
console.log('═══════════════════════════════════════════════════════════════\n');

const summary = {}; // deptName -> { count, feedbackCount }

for (const orphan of orphans) {
  const orphanId = orphan._id;
  const studentIds = orphan.students || [];
  
  // Get department votes
  const deptVotes = {};
  const yearVotes = {};
  
  for (const sid of studentIds) {
    const student = studentMap.get(String(sid));
    if (student) {
      const deptKey = String(student.departmentId || 'unknown');
      const yearKey = String(student.academicYearId || 'unknown');
      deptVotes[deptKey] = (deptVotes[deptKey] || 0) + 1;
      yearVotes[yearKey] = (yearVotes[yearKey] || 0) + 1;
    }
  }
  
  // Determine dominant department
  const sortedDepts = Object.entries(deptVotes).sort((a, b) => b[1] - a[1]);
  const topDeptId = sortedDepts[0]?.[0];
  const topDeptName = topDeptId ? (deptMap.get(topDeptId) || `unknown(${topDeptId})`) : 'NO STUDENTS FOUND';
  
  const sortedYears = Object.entries(yearVotes).sort((a, b) => b[1] - a[1]);
  const topYearId = sortedYears[0]?.[0];
  const topYearName = topYearId ? (yearMap.get(topYearId) || `yearId:${topYearId}`) : '?';
  
  // ObjectId timestamp
  const hex = orphanId.substring(0, 8);
  const createdAt = new Date(parseInt(hex, 16) * 1000).toISOString().slice(0, 16);
  
  console.log(`AssignmentId: ${orphanId}`);
  console.log(`  Created   : ${createdAt}`);
  console.log(`  Feedbacks : ${orphan.count}  (from ${studentIds.length} unique students)`);
  console.log(`  Dept      : ${topDeptName} (${topDeptId})`);
  console.log(`  Year group: ${topYearName}`);
  if (sortedDepts.length > 1) {
    console.log(`  (other depts: ${sortedDepts.slice(1).map(([id, n]) => `${deptMap.get(id)||id}:${n}`).join(', ')})`);
  }
  console.log();
  
  if (!summary[topDeptName]) summary[topDeptName] = { assignCount: 0, feedbackCount: 0 };
  summary[topDeptName].assignCount++;
  summary[topDeptName].feedbackCount += orphan.count;
}

console.log('═══════════════════════════════════════════════════════════════');
console.log('SUMMARY BY DEPARTMENT');
console.log('═══════════════════════════════════════════════════════════════');
for (const [dept, data] of Object.entries(summary).sort((a, b) => b[1].feedbackCount - a[1].feedbackCount)) {
  console.log(`  ${dept}: ${data.assignCount} orphaned assignments, ${data.feedbackCount} feedback records`);
}

await client.close();
