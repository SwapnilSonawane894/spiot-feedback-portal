/**
 * Analyze the database dump to find exact orphaned → current assignment mapping
 * for CO department using the JSON dump files.
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DUMP = '/Users/swapnilsonawane/Desktop/Feedback Project SPIOT/FeedbackPortal2';

function parseNDJSON(file) {
  const text = readFileSync(resolve(DUMP, file), 'utf8');
  const results = [];
  let depth = 0, start = -1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{') { if (depth === 0) start = i; depth++; }
    else if (text[i] === '}') { depth--; if (depth === 0 && start >= 0) { results.push(JSON.parse(text.slice(start, i+1))); start = -1; } }
  }
  return results;
}

const getOid = v => v && (v['$oid'] || String(v));

const assigns   = parseNDJSON('facultyAssignments.json');
const subjects  = parseNDJSON('subjects.json');
const staffList = parseNDJSON('staff.json');
const acadYears = parseNDJSON('academicYears.json');
const feedback  = parseNDJSON('feedback.json');
const users     = parseNDJSON('users.json');

console.log(`Assignments: ${assigns.length}  Subjects: ${subjects.length}  Staff: ${staffList.length}`);
console.log(`AcademicYears: ${acadYears.length}  Feedback: ${feedback.length}  Users: ${users.length}\n`);

// Build maps
const subjMap  = new Map(subjects.map(s  => [getOid(s._id), s]));
const staffMap = new Map(staffList.map(s => [getOid(s._id), s]));
const yearMap  = new Map(acadYears.map(y => [getOid(y._id), y]));
const userMap  = new Map(users.map(u => [getOid(u._id), u]));

const existingIds = new Set(assigns.map(a => getOid(a._id)));

// Group feedback by assignmentId
const fbByAssign = {};
for (const fb of feedback) {
  const aid = getOid(fb.assignmentId);
  if (!fbByAssign[aid]) fbByAssign[aid] = [];
  fbByAssign[aid].push(fb);
}

const orphanedIds = Object.keys(fbByAssign).filter(id => !existingIds.has(id));
console.log(`Orphaned assignmentIds: ${orphanedIds.length}`);

// ── Identify CO orphans via student departmentId ────────────────────────────
const CO_DEPT = '6906ec26b1773184f4f56bad';

const coOrphans = orphanedIds.filter(oid => {
  const fbs = fbByAssign[oid];
  const votes = {};
  for (const fb of fbs) {
    const u = userMap.get(getOid(fb.studentId));
    if (u) {
      const d = getOid(u.departmentId) || 'unk';
      votes[d] = (votes[d]||0)+1;
    }
  }
  const top = Object.entries(votes).sort((a,b)=>b[1]-a[1])[0];
  return top?.[0] === CO_DEPT;
});

console.log(`CO orphaned assignments: ${coOrphans.length}\n`);

// ── Current CO odd-sem assignments from dump ────────────────────────────────
const coCurrentAssigns = assigns.filter(a => {
  const dept = getOid(a.departmentId);
  return dept === CO_DEPT;
});

// Determine odd-sem subjects
const oddSubjIds = new Set(
  subjects
    .filter(s => { const sem = Number(s.semester); return !isNaN(sem) && sem % 2 === 1; })
    .map(s => getOid(s._id))
);

const coOddSemCurrent = coCurrentAssigns.filter(a => oddSubjIds.has(getOid(a.subjectId)));
console.log(`Current CO odd-sem assignments: ${coOddSemCurrent.length}`);
console.log(`Current CO even-sem assignments: ${coCurrentAssigns.length - coOddSemCurrent.length}\n`);

// ── Group orphans by academicYear (derived from students) ───────────────────
function getYearForOrphan(oid) {
  const fbs = fbByAssign[oid] || [];
  const votes = {};
  for (const fb of fbs) {
    const u = userMap.get(getOid(fb.studentId));
    if (u?.academicYearId) {
      const y = getOid(u.academicYearId);
      votes[y] = (votes[y]||0)+1;
    }
  }
  return Object.entries(votes).sort((a,b)=>b[1]-a[1])[0]?.[0] || 'unknown';
}

const orphansByYear = {};
for (const oid of coOrphans) {
  const y = getYearForOrphan(oid);
  if (!orphansByYear[y]) orphansByYear[y] = [];
  orphansByYear[y].push(oid);
}
// Sort by ObjectId within each year (= creation order)
for (const y of Object.keys(orphansByYear)) orphansByYear[y].sort((a,b) => a.localeCompare(b));

// ── Group current CO odd-sem by academicYear, sorted by ObjectId ────────────
const currentByYear = {};
for (const a of coOddSemCurrent) {
  const y = getOid(a.academicYearId);
  if (!currentByYear[y]) currentByYear[y] = [];
  currentByYear[y].push(a);
}
for (const y of Object.keys(currentByYear)) currentByYear[y].sort((a,b) => getOid(a._id).localeCompare(getOid(b._id)));

// ── Print the proposed mapping ──────────────────────────────────────────────
console.log('══════════════════════════════════════════════════════════════');
console.log('PROPOSED POSITIONAL MAPPING  (orphaned → staffId / subjectId)');
console.log('══════════════════════════════════════════════════════════════\n');

const finalMappings = [];

for (const yearId of Object.keys(orphansByYear).sort()) {
  const orphanGroup   = orphansByYear[yearId];
  const currentGroup  = (currentByYear[yearId] || []);
  const yearName      = yearMap.get(yearId)?.name || yearMap.get(yearId)?.year || yearId;

  console.log(`Year: ${yearName} (${yearId})`);
  console.log(`  Orphaned: ${orphanGroup.length}  |  Current odd-sem: ${currentGroup.length}`);

  if (orphanGroup.length !== currentGroup.length) {
    console.log(`  ⚠️  COUNT MISMATCH — orphaned=${orphanGroup.length}  current=${currentGroup.length}`);
  }

  const limit = Math.min(orphanGroup.length, currentGroup.length);
  for (let i = 0; i < limit; i++) {
    const orphanId  = orphanGroup[i];
    const current   = currentGroup[i];
    const subjectId = getOid(current.subjectId);
    const staffId   = getOid(current.staffId);
    const subj      = subjMap.get(subjectId);
    const staff     = staffMap.get(staffId);
    const fbCount   = (fbByAssign[orphanId] || []).length;

    console.log(`  [${i+1}] ${orphanId}  (${fbCount} fbs) → ${staff?.name || 'unknown'} / ${subj?.name || 'unknown'} (sem ${subj?.semester})`);

    finalMappings.push({ orphanId, staffId, subjectId, academicYearId: yearId, fbCount });
  }

  for (let i = limit; i < orphanGroup.length; i++) {
    console.log(`  [${i+1}] ${orphanGroup[i]}  — ⚠️ NO MATCH`);
  }

  console.log();
}

console.log('══════════════════════════════════════════════════════════════');
console.log(`Total resolvable: ${finalMappings.length} / ${coOrphans.length}`);
console.log(`Total feedback records that will be linked: ${finalMappings.reduce((s,m) => s+m.fbCount, 0)}`);
console.log('══════════════════════════════════════════════════════════════\n');

// Output the mapping as JSON for use by the recovery script
import { writeFileSync } from 'fs';
const outPath = '/Users/swapnilsonawane/Desktop/Feedback Project SPIOT/spiot-feedback-portal/tmp/co-mapping.json';
writeFileSync(outPath, JSON.stringify(finalMappings, null, 2));
console.log(`Mapping written to: ${outPath}`);
