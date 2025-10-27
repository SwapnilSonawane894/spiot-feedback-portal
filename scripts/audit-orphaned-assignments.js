const { MongoClient, ObjectId } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
if (!MONGO_URI) {
  console.error('Please set MONGO_URI or MONGODB_URI in the environment');
  process.exit(1);
}

const CO_DEPT_ID = '68f6390b641c7bcb2781b39c';
const EE_TYCO_YEAR_ID = '68fc86d399ba276515402d23';
const EE_SYCO_YEAR_ID = '68fc86be99ba276515402d22';

async function auditOrphans() {
  const client = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db('feedback');
    const facultyAssignments = db.collection('facultyAssignments');

    // Find ALL CO assignments
    const allCO = await facultyAssignments.find({ departmentId: CO_DEPT_ID }).toArray();
    console.log(`📊 Total CO assignments: ${allCO.length}\n`);

    // Group by academicYearId
    const grouped = {};
    allCO.forEach(a => {
      const yearId = a.academicYearId ? String(a.academicYearId) : 'NULL';
      if (!grouped[yearId]) grouped[yearId] = [];
      grouped[yearId].push(a);
    });

    console.log('📊 Grouped by academicYearId:');
    Object.keys(grouped).forEach(yearId => {
      console.log(`  ${yearId}: ${grouped[yearId].length} assignments`);
      if (yearId === EE_TYCO_YEAR_ID || yearId === EE_SYCO_YEAR_ID) {
        console.log('    ❌ ORPHANED! Sample:');
        const s = grouped[yearId][0];
        console.log(`       _id: ${s._id}`);
        console.log(`       subjectId: ${s.subjectId}`);
        console.log(`       academicYearId raw:`, s.academicYearId);
        console.log(`       academicYearId type: ${typeof s.academicYearId}`);
      }
    });

    // Try both string and ObjectId comparisons for the EE TYCO year
    console.log('\n🔍 Trying different query types for EE_TYCO_YEAR_ID:');
    const stringMatch = await facultyAssignments.find({ departmentId: CO_DEPT_ID, academicYearId: EE_TYCO_YEAR_ID }).toArray();
    console.log(`  String match (TYCO): ${stringMatch.length}`);

    let objMatchCount = 0;
    try {
      const objMatch = await facultyAssignments.find({ departmentId: CO_DEPT_ID, academicYearId: new ObjectId(EE_TYCO_YEAR_ID) }).toArray();
      objMatchCount = objMatch.length;
      console.log(`  ObjectId match (TYCO): ${objMatchCount}`);
    } catch (e) {
      console.log('  ObjectId match (TYCO) threw:', e.message || e);
    }

    // And for EE_SYCO_YEAR_ID
    console.log('\n🔍 Trying different query types for EE_SYCO_YEAR_ID:');
    const stringMatch2 = await facultyAssignments.find({ departmentId: CO_DEPT_ID, academicYearId: EE_SYCO_YEAR_ID }).toArray();
    console.log(`  String match (SYCO): ${stringMatch2.length}`);
    try {
      const objMatch2 = await facultyAssignments.find({ departmentId: CO_DEPT_ID, academicYearId: new ObjectId(EE_SYCO_YEAR_ID) }).toArray();
      console.log(`  ObjectId match (SYCO): ${objMatch2.length}`);
    } catch (e) {
      console.log('  ObjectId match (SYCO) threw:', e.message || e);
    }

    console.log('\nAudit complete.');
  } catch (error) {
    console.error('❌ Error:', error.message || error);
  } finally {
    await client.close();
  }
}

auditOrphans();
