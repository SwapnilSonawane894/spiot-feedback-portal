const { MongoClient, ObjectId } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb+srv://swapnilsonawane:TVDFjnMt9C97ieJO@cluster0.wqnku0.mongodb.net/feedback?retryWrites=true&w=majority&appName=Feedback';

const CO_DEPT_ID = '68f6390b641c7bcb2781b39c';
const TYCO_YEAR_ID = '68f63990dc335227e2601fe2';
const SYCO_YEAR_ID = '68f63980dc335227e2601fe1';

// Orphaned EE academic year IDs that appear in CO assignments
const EE_TYCO_YEAR_ID = '68fc86d399ba276515402d23';
const EE_SYCO_YEAR_ID = '68fc86be99ba276515402d22';

async function connectWithRetry(uri, opts = {}, maxRetries = 3, delayMs = 2000) {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      const client = new MongoClient(uri, opts);
      await client.connect();
      return client;
    } catch (err) {
      attempt += 1;
      console.warn(`🔌 MongoDB connect attempt ${attempt} failed: ${err.message}`);
      if (attempt >= maxRetries) throw err;
      await new Promise((r) => setTimeout(r, delayMs * attempt));
    }
  }
}

async function fixAcademicYearIds() {
  const opts = { serverSelectionTimeoutMS: 5000, socketTimeoutMS: 45000 };
  let client = null;
  try {
    console.log('🔌 Connecting to MongoDB...');
    client = await connectWithRetry(MONGO_URI, opts, 3, 1500);
    console.log('✅ Connected!');

  // Use the same DB name as the application code
  const db = client.db('feedback');
    const facultyAssignments = db.collection('facultyAssignments');
    const departmentSubjects = db.collection('departmentSubjects');

    // Helper to find junction/master ids for a given orphan academic year id from departmentSubjects
    async function findSubjectIdsForOrphanYear(orphanYearId) {
      const orClauses = [
        { 'academicYear.id': orphanYearId },
        { 'academicYear._id': orphanYearId },
        { academicYearId: orphanYearId },
        { academicYear: { $elemMatch: { id: orphanYearId } } }
      ];
      // also try ObjectId forms
      const oid = ObjectId.isValid(orphanYearId) ? new ObjectId(orphanYearId) : null;
      if (oid) {
        orClauses.push({ 'academicYear._id': oid });
        orClauses.push({ academicYearId: oid });
      }

      const rows = await departmentSubjects.find({ $or: orClauses }).toArray();
      const masterIds = new Set();
      const junctionIds = new Set();
      for (const r of rows) {
        // departmentSubjects in this DB use `subjectId` for master subject id and `_id` as junction id
        if (r.subjectId) masterIds.add(String(r.subjectId));
        if (r._id) junctionIds.add(String(r._id));
      }
      return { rows, masterIds: Array.from(masterIds), junctionIds: Array.from(junctionIds) };
    }

    // Diagnostics: find subject/junction ids for the orphan EE year ids
    const eeTycoSubjects = await findSubjectIdsForOrphanYear(EE_TYCO_YEAR_ID);
    const eeSycoSubjects = await findSubjectIdsForOrphanYear(EE_SYCO_YEAR_ID);
  console.log('\n🔎 departmentSubjects rows that reference EE_TYCO_YEAR_ID:', eeTycoSubjects.rows.length);
  console.log('   sample rows (first 3):', eeTycoSubjects.rows.slice(0,3));
  console.log('   masterIds sample:', eeTycoSubjects.masterIds.slice(0,5));
  console.log('   junctionIds sample:', eeTycoSubjects.junctionIds.slice(0,5));
  console.log('\n🔎 departmentSubjects rows that reference EE_SYCO_YEAR_ID:', eeSycoSubjects.rows.length);
  console.log('   sample rows (first 3):', eeSycoSubjects.rows.slice(0,3));
  console.log('   masterIds sample:', eeSycoSubjects.masterIds.slice(0,5));
  console.log('   junctionIds sample:', eeSycoSubjects.junctionIds.slice(0,5));

      // Diagnostic: list distinct academicYearId values in CO department assignments
      try {
        const distinctYears = await facultyAssignments.distinct('academicYearId', { departmentId: { $in: [CO_DEPT_ID, new ObjectId(CO_DEPT_ID)] } });
        console.log('\n🔎 Distinct academicYearId values in CO facultyAssignments:', distinctYears);
        for (const dy of distinctYears.slice(0, 10)) {
          const cnt = await facultyAssignments.countDocuments({ departmentId: { $in: [CO_DEPT_ID, new ObjectId(CO_DEPT_ID)] }, academicYearId: dy });
          console.log(`  - ${dy}: ${cnt} docs`);
          const sample = await facultyAssignments.find({ departmentId: { $in: [CO_DEPT_ID, new ObjectId(CO_DEPT_ID)] }, academicYearId: dy }).limit(3).toArray();
          console.log('    sample:', sample.map(s => ({ id: s._id?.toString(), subjectId: s.subjectId, academicYearId: s.academicYearId })));
        }
      } catch (diagErr) {
        console.warn('Could not read distinct academicYearId:', diagErr.message || diagErr);
      }

    console.log('\n🔧 Fixing assignments that reference EE TYCO year (via subject/junction ids) -> set to CO TYCO');
    const tycoSubjectIds = Array.from(new Set([...(eeTycoSubjects.masterIds || []), ...(eeTycoSubjects.junctionIds || [])]));
    if (tycoSubjectIds.length === 0) {
      console.log('  No subject/junction ids found for EE_TYCO_YEAR_ID — skipping tyco update.');
    } else {
      const tycoFilter = {
        departmentId: { $in: [CO_DEPT_ID, new ObjectId(CO_DEPT_ID)] },
        subjectId: { $in: tycoSubjectIds.concat(tycoSubjectIds.map(id => (ObjectId.isValid(id) ? new ObjectId(id) : id))) }
      };
      const beforeTyco = await facultyAssignments.countDocuments(tycoFilter);
      console.log(`  Found ${beforeTyco} assignments matching tyco subject/junction filter`);
      const res1 = await facultyAssignments.updateMany(tycoFilter, { $set: { academicYearId: TYCO_YEAR_ID, updatedAt: new Date() } });
      console.log(`  ✅ Updated ${res1.modifiedCount} assignments (subjectId -> set academicYearId TYCO)`);
    }

    console.log('\n🔧 Fixing assignments that reference EE SYCO year (via subject/junction ids) -> set to CO SYCO');
    const sycoSubjectIds = Array.from(new Set([...(eeSycoSubjects.masterIds || []), ...(eeSycoSubjects.junctionIds || [])]));
    if (sycoSubjectIds.length === 0) {
      console.log('  No subject/junction ids found for EE_SYCO_YEAR_ID — skipping syco update.');
    } else {
      const sycoFilter = {
        departmentId: { $in: [CO_DEPT_ID, new ObjectId(CO_DEPT_ID)] },
        subjectId: { $in: sycoSubjectIds.concat(sycoSubjectIds.map(id => (ObjectId.isValid(id) ? new ObjectId(id) : id))) }
      };
      const beforeSyco = await facultyAssignments.countDocuments(sycoFilter);
      console.log(`  Found ${beforeSyco} assignments matching syco subject/junction filter`);
      const res2 = await facultyAssignments.updateMany(sycoFilter, { $set: { academicYearId: SYCO_YEAR_ID, updatedAt: new Date() } });
      console.log(`  ✅ Updated ${res2.modifiedCount} assignments (subjectId -> set academicYearId SYCO)`);
    }

    // Phase 2: catch-all - update any remaining assignments that still reference the orphan EE academicYear IDs
    console.log('\n🔧 Phase 2: Fixing any remaining orphaned assignments by academicYearId directly...');
    const remainingTyco = await facultyAssignments.updateMany(
      { departmentId: CO_DEPT_ID, academicYearId: EE_TYCO_YEAR_ID },
      { $set: { academicYearId: TYCO_YEAR_ID, updatedAt: new Date() } }
    );
    console.log(`  ✅ Updated ${remainingTyco.modifiedCount} remaining TYCO assignments`);

    const remainingSyco = await facultyAssignments.updateMany(
      { departmentId: CO_DEPT_ID, academicYearId: EE_SYCO_YEAR_ID },
      { $set: { academicYearId: SYCO_YEAR_ID, updatedAt: new Date() } }
    );
    console.log(`  ✅ Updated ${remainingSyco.modifiedCount} remaining SYCO assignments`);

    console.log('\n🎉 All fixes completed!');
  } catch (error) {
    console.error('❌ Error while updating assignments:', error && error.message ? error.message : error);
    console.error('Full error:', error);
  } finally {
    if (client) await client.close();
  }
}

if (require.main === module) {
  fixAcademicYearIds().catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { fixAcademicYearIds };
