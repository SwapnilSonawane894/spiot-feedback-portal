const { MongoClient } = require('mongodb');

const uri = process.env.MONGO_URI || "mongodb+srv://swapnilsonawane:TVDFjnMt9C97ieJO@cluster0.wqnku0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const dbName = process.env.DB_NAME || "feedbackPortal";

async function verify() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    
    const coDept = await db.collection('departments').findOne({ abbreviation: 'CO' });
    const eeDept = await db.collection('departments').findOne({ abbreviation: 'EE' });
    
    const entrepreneurship = await db.collection('subjects').findOne({ subjectCode: '315002' });
    const seminar = await db.collection('subjects').findOne({ subjectCode: '315003' });
    
    // Get academic years
    const academicYears = await db.collection('academicYears').find({}).toArray();
    const ayMap = {};
    academicYears.forEach(ay => { ayMap[ay._id.toString()] = ay.abbreviation; });
    
    console.log('\n=== ENTREPRENEURSHIP (315002) ===');
    const entrep = await db.collection('departmentSubjects').find({
      subjectId: entrepreneurship._id.toString()
    }).toArray();
    
    entrep.forEach(e => {
      const dept = e.departmentId === coDept._id.toString() ? 'CO' : (e.departmentId === eeDept._id.toString() ? 'EE' : e.departmentId);
      const ay = ayMap[e.academicYearId] || 'UNKNOWN';
      console.log(`  ${dept} → ${ay}`);
    });
    
    console.log('\n=== SEMINAR (315003) ===');
    const sem = await db.collection('departmentSubjects').find({
      subjectId: seminar._id.toString()
    }).toArray();
    
    sem.forEach(e => {
      const dept = e.departmentId === coDept._id.toString() ? 'CO' : (e.departmentId === eeDept._id.toString() ? 'EE' : e.departmentId);
      const ay = ayMap[e.academicYearId] || 'UNKNOWN';
      console.log(`  ${dept} → ${ay}`);
    });
    
    console.log('\n✅ Expected:');
    console.log('  Entrepreneurship: CO → TYCO, EE → TYEE');
    console.log('  Seminar: CO → TYCO, EE → TYEE');
    
  } finally {
    await client.close();
  }
}

verify().catch(err => { console.error('Script failed:', err); process.exit(1); });
