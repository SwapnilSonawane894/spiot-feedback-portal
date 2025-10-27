const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGO_URI || "mongodb+srv://swapnilsonawane:TVDFjnMt9C97ieJO@cluster0.wqnku0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const dbName = process.env.DB_NAME || "feedbackPortal";

async function findNullAcademicYears() {
  const client = new MongoClient(uri, { useUnifiedTopology: true });
  try {
    await client.connect();
    const db = client.db(dbName);
    
    // Get all departmentSubjects with null academicYearId
    const nullEntries = await db.collection('departmentSubjects')
      .find({ academicYearId: null })
      .toArray();
    
    console.log(`\nFound ${nullEntries.length} departmentSubjects entries with null academicYearId\n`);
    
    if (nullEntries.length === 0) return;

    // Get departments and subjects for display
    const deptIds = [...new Set(nullEntries.map(e => e.departmentId))];
    const subjectIds = [...new Set(nullEntries.map(e => e.subjectId))];
    
    const departments = await db.collection('departments').find({
      _id: { $in: deptIds.map(id => new ObjectId(id)) }
    }).toArray();
    
    const subjects = await db.collection('subjects').find({
      _id: { $in: subjectIds.map(id => new ObjectId(id)) }
    }).toArray();
    
    const deptMap = {};
    departments.forEach(d => { deptMap[d._id.toString()] = d.abbreviation || d.name || 'UNKNOWN'; });
    
    const subjectMap = {};
    subjects.forEach(s => { 
      subjectMap[s._id.toString()] = {
        name: s.name,
        code: s.subjectCode,
        academicYearId: s.academicYearId // Check if subject has academicYearId
      };
    });
    
    // Group by department
    const byDept = {};
    nullEntries.forEach(entry => {
      const dept = deptMap[entry.departmentId] || 'UNKNOWN';
      if (!byDept[dept]) byDept[dept] = [];
      
      const subj = subjectMap[entry.subjectId];
      byDept[dept].push({
        code: subj?.code,
        name: subj?.name,
        subjectAcademicYearId: subj?.academicYearId, // From subject doc
        junctionId: entry._id.toString(),
        subjectId: entry.subjectId
      });
    });
    
    // Display results
    for (const [dept, subjects] of Object.entries(byDept)) {
      console.log(`\n=== ${dept} Department (${subjects.length} subjects) ===`);
      subjects.forEach(s => {
        console.log(`  ${s.code || s.subjectId} - ${s.name || '<no name>'}`);
        if (s.subjectAcademicYearId) {
          console.log(`    → Subject has academicYearId: ${s.subjectAcademicYearId} (can copy this!)`);
        } else {
          console.log(`    → Subject also has null academicYearId (needs manual assignment)`);
        }
        console.log(`    → junctionId: ${s.junctionId}`);
      });
    }
    
  } finally {
    await client.close();
  }
}

findNullAcademicYears().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});
