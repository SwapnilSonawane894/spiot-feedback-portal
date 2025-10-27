const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGO_URI || "mongodb+srv://swapnilsonawane:TVDFjnMt9C97ieJO@cluster0.wqnku0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const dbName = process.env.DB_NAME || "feedbackPortal";

async function fixDuplicates() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    
    // Get academic year IDs
    const tycoAY = await db.collection('academicYears').findOne({ abbreviation: 'TYCO' });
    const tyeeAY = await db.collection('academicYears').findOne({ abbreviation: 'TYEE' });
    
    // Get department IDs
    const coDept = await db.collection('departments').findOne({ abbreviation: 'CO' });
    const eeDept = await db.collection('departments').findOne({ abbreviation: 'EE' });
    
    // Get subject IDs
    const entrepreneurship = await db.collection('subjects').findOne({ subjectCode: '315002' });
    const seminar = await db.collection('subjects').findOne({ subjectCode: '315003' });
    
    console.log('\n=== BEFORE FIX ===');
    const beforeCO = await db.collection('departmentSubjects').find({
      departmentId: coDept._id.toString(),
      subjectId: { $in: [entrepreneurship._id.toString(), seminar._id.toString()] }
    }).toArray();
    console.log(`CO has ${beforeCO.length} entries for these subjects`);
    beforeCO.forEach(e => console.log(`  - ${e.subjectId.slice(0,8)}... ay=${e.academicYearId}`));
    
    const beforeEE = await db.collection('departmentSubjects').find({
      departmentId: eeDept._id.toString(),
      subjectId: { $in: [entrepreneurship._id.toString(), seminar._id.toString()] }
    }).toArray();
    console.log(`EE has ${beforeEE.length} entries for these subjects`);
    beforeEE.forEach(e => console.log(`  - ${e.subjectId.slice(0,8)}... ay=${e.academicYearId}`));
    
    // DELETE incorrect CO-TYEE entries (TYEE belongs to EE, not CO!)
    const deletedCOTYEE = await db.collection('departmentSubjects').deleteMany({
      departmentId: coDept._id.toString(),
      subjectId: { $in: [entrepreneurship._id.toString(), seminar._id.toString()] },
      academicYearId: tyeeAY._id.toString()
    });
    
    console.log(`\n✓ Deleted ${deletedCOTYEE.deletedCount} incorrect CO-TYEE entries`);
    
    // Verify CO now only has TYCO entries
    const afterCO = await db.collection('departmentSubjects').find({
      departmentId: coDept._id.toString(),
      subjectId: { $in: [entrepreneurship._id.toString(), seminar._id.toString()] }
    }).toArray();
    
    console.log('\n=== AFTER FIX ===');
    console.log(`CO now has ${afterCO.length} entries (should be 2 - both TYCO)`);
    afterCO.forEach(entry => {
      const ayId = entry.academicYearId === tycoAY._id.toString() ? 'TYCO' : (entry.academicYearId === tyeeAY._id.toString() ? 'TYEE' : 'OTHER');
      console.log(`  - Subject ${entry.subjectId.slice(0,8)}... → ${ayId}`);
    });
    
    console.log(`EE still has ${beforeEE.length} entries (unchanged)`);
    
  } finally {
    await client.close();
  }
}

fixDuplicates().catch(err => { console.error('Script failed:', err); process.exit(1); });
