#!/usr/bin/env node
// Normalize semester strings in facultyAssignments (and optionally departmentSubjects)
// Dry-run by default. Use --apply to perform updates.
// Usage:
// MONGODB_URI="..." DB_NAME="feedbackPortal" DEPARTMENT_ID="<id>" node scripts/normalize-semester-and-plan.js [--apply]

const { MongoClient, ObjectId } = require('mongodb');
const fs = require('fs');
const path = require('path');

function canonicalizeSemester(raw) {
  if (!raw) return '';
  const s = String(raw).trim().toLowerCase();
  // Try to capture odd/even and year pair like 2025-26 or 2025/26
  const yearMatch = s.match(/(20\d{2})[^0-9]?(\d{2})/);
  let yearPart = '';
  if (yearMatch) {
    yearPart = `${yearMatch[1]}-${yearMatch[2]}`;
  } else {
    // fallback: try something like 2025-26 or 2025/26 anywhere
    const y2 = s.match(/20\d{2}[-\/]20\d{2}|20\d{2}[-\/]\d{2}/);
    if (y2) yearPart = y2[0].replace('/', '-');
  }

  const odd = s.includes('odd') || /(^|\s)o\b/.test(s) || s.includes('odd semester') || s.includes('s1') || s.includes('s-1');
  const even = s.includes('even') || /(^|\s)e\b/.test(s) || s.includes('even semester') || s.includes('s2') || s.includes('s-2');

  let prefix = '';
  if (odd && !even) prefix = 'odd';
  else if (even && !odd) prefix = 'even';
  else if (s.includes('odd')) prefix = 'odd';
  else if (s.includes('even')) prefix = 'even';

  if (!prefix && !yearPart) {
    // last resort: return lower-dashed version
    return s.replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  }

  if (!yearPart) {
    // assume current academic year if missing
    const now = new Date();
    const y = now.getFullYear();
    const next = String((y + 1)).slice(2);
    yearPart = `${y}-${next}`;
  }

  return `${prefix}-${yearPart}`;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.DB_NAME || 'feedbackPortal';
  const departmentId = process.env.DEPARTMENT_ID;
  const apply = process.argv.includes('--apply');

  if (!uri) { console.error('MONGODB_URI required'); process.exit(2); }

  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  await client.connect();
  const db = client.db(dbName);

  const filter = {};
  if (departmentId) filter.departmentId = departmentId;

  console.log('Query filter:', filter, 'apply=', apply);

  const assignments = await db.collection('facultyAssignments').find(filter).toArray();
  console.log('Assignments fetched:', assignments.length);

  const plan = [];
  for (const a of assignments) {
    const oldSem = a.semester || a.sem || '';
    const newSem = canonicalizeSemester(oldSem);
    if (newSem && newSem !== (oldSem || '').toLowerCase().replace(/\s+/g, ' ').trim()) {
      plan.push({ id: a._id.toString(), oldSem, newSem });
    }
  }

  console.log('Assignments with changed semester after canonicalization:', plan.length);
  const outPath = path.resolve(process.cwd(), 'semester_normalize_plan.csv');
  const header = 'assignmentId,oldSemester,newSemester\n';
  const lines = [header];
  for (const p of plan) lines.push(`${p.id},"${p.oldSem}","${p.newSem}"\n`);
  fs.writeFileSync(outPath, lines.join(''));
  console.log('Wrote', outPath);

  if (apply && plan.length > 0) {
    console.log('Applying semester normalization updates (this will write to DB)...');
    for (const p of plan) {
      await db.collection('facultyAssignments').updateOne({ _id: new ObjectId(p.id) }, { $set: { semester: p.newSem } });
    }
    console.log('Applied', plan.length, 'updates.');
  } else if (!apply) {
    console.log('Dry-run only. Re-run with --apply to perform updates.');
  }

  await client.close();
}

main().catch(err => { console.error(err); process.exit(1); });
