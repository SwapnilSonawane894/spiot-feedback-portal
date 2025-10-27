const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGO_URI || "mongodb+srv://swapnilsonawane:TVDFjnMt9C97ieJO@cluster0.wqnku0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const dbName = process.env.DB_NAME || 'feedbackPortal';

async function buildServiceLikeResult(departmentId) {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  // mimic current departmentSubjectsService.findSubjectsForDepartment implementation
  const rows = await db.collection('departmentSubjects').find({ departmentId: String(departmentId) }).toArray();
  const subjectIdStrs = rows.map(r => String(r.subjectId)).filter(Boolean);

  const objectIds = [];
  const stringIds = [];
  for (const sid of subjectIdStrs) {
    if (/^[0-9a-fA-F]{24}$/.test(sid)) {
      try { objectIds.push(new ObjectId(sid)); } catch (e) { stringIds.push(sid); }
    } else {
      stringIds.push(sid);
    }
  }

  const orClauses = [];
  if (objectIds.length) orClauses.push({ _id: { $in: objectIds } });
  if (stringIds.length) orClauses.push({ _id: { $in: stringIds } });
  if (orClauses.length === 0) {
    await client.close();
    return { rows, subjects: [] };
  }

  const query = orClauses.length === 1 ? orClauses[0] : { $or: orClauses };
  const subjects = await db.collection('subjects').find(query).toArray();

  // map subjects by id string
  const subjectMap = {};
  subjects.forEach(s => { subjectMap[s._id.toString()] = s; });

  // current service returns subjects deduped (one per subject), but we'll return both views
  const dedupedSubjects = subjects.map(s => ({ id: s._id.toString(), ...s }));

  // build fixed results: one entry per departmentSubjects row
  // build fixed results: one entry per departmentSubjects row
  // fetch academic years referenced in rows so we can attach abbreviation
  const ayIds = Array.from(new Set(rows.map(r => r.academicYearId).filter(Boolean)));
  const ayObjIds = [];
  const ayStringIds = [];
  for (const aid of ayIds) {
    if (/^[0-9a-fA-F]{24}$/.test(aid)) {
      try { ayObjIds.push(new ObjectId(aid)); } catch (e) { ayStringIds.push(aid); }
    } else {
      ayStringIds.push(aid);
    }
  }
  const ayOr = [];
  if (ayObjIds.length) ayOr.push({ _id: { $in: ayObjIds } });
  if (ayStringIds.length) ayOr.push({ _id: { $in: ayStringIds } });
  let ayMap = {};
  if (ayOr.length) {
    const ayDocs = await db.collection('academicYears').find(ayOr.length === 1 ? ayOr[0] : { $or: ayOr }).toArray();
    ayDocs.forEach(a => { ayMap[a._id.toString()] = a; });
  }

  const fixedResults = rows.map(r => {
    const subj = subjectMap[r.subjectId];
    if (!subj) return null;
    const out = { id: subj._id.toString(), ...subj };
    out._junctionId = r._id;
    out.academicYearId = r.academicYearId || null;
    out.academicYear = r.academicYearId ? (ayMap[r.academicYearId] || null) : null;
    return out;
  }).filter(Boolean);

  await client.close();
  return { rows, subjects: dedupedSubjects, subjectMap, fixedResults };
}

async function testAPIResponse() {
  const coDeptId = '68f6390b641c7bcb2781b39c'; // CO
  const eeDeptId = '68f6390b641c7bcb2781b39d'; // EE

  console.log('\n=== CO DEPARTMENT SUBJECTS (service-like) ===');
  const co = await buildServiceLikeResult(coDeptId);
  console.log(`departmentSubjects rows: ${co.rows.length}`);
  console.log(`subjects returned (deduped): ${co.subjects.length}`);

  const problemCodes = ['315002', '315003', '313002'];
  console.log('\nProblem subjects in CO (by deduped subjects):');
  co.subjects.filter(s => problemCodes.includes(s.subjectCode)).forEach(s => {
    console.log(`  - ${s.name} (${s.subjectCode}) id=${s.id}`);
  });

  console.log('\nFull departmentSubjects rows for CO:');
  co.rows.forEach(r => console.log(`  - subjectId=${r.subjectId}, academicYearId=${r.academicYearId}, _id=${r._id}`));

  console.log('\nFixed (per-row) results for CO:');
  co.fixedResults.forEach(fr => {
    console.log(`  - ${fr.name} (${fr.subjectCode}) - AY: ${fr.academicYear ? fr.academicYear.abbreviation : 'NO AY'} - junction=${fr._junctionId}`);
  });

  console.log('\n=== EE DEPARTMENT SUBJECTS (service-like) ===');
  const ee = await buildServiceLikeResult(eeDeptId);
  console.log(`departmentSubjects rows: ${ee.rows.length}`);
  console.log(`subjects returned (deduped): ${ee.subjects.length}`);

  console.log('\nProblem subjects in EE (by deduped subjects):');
  ee.subjects.filter(s => problemCodes.includes(s.subjectCode)).forEach(s => {
    console.log(`  - ${s.name} (${s.subjectCode}) id=${s.id}`);
  });

  console.log('\nFull departmentSubjects rows for EE:');
  ee.rows.forEach(r => console.log(`  - subjectId=${r.subjectId}, academicYearId=${r.academicYearId}, _id=${r._id}`));

  console.log('\nFixed (per-row) results for EE:');
  ee.fixedResults.forEach(fr => {
    console.log(`  - ${fr.name} (${fr.subjectCode}) - AY: ${fr.academicYear ? fr.academicYear.abbreviation : 'NO AY'} - junction=${fr._junctionId}`);
  });
}

testAPIResponse().catch(err => { console.error('Test failed:', err); process.exit(1); });
