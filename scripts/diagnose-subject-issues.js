const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGO_URI || "mongodb+srv://swapnilsonawane:TVDFjnMt9C97ieJO@cluster0.wqnku0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const dbName = process.env.DB_NAME || "feedbackPortal";

async function diagnose() {
  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  try {
    await client.connect();
    const db = client.db(dbName);
    
    // Get departments
    const departments = await db.collection('departments').find({}).toArray();
    const deptMap = {};
    departments.forEach(d => { deptMap[d._id.toString()] = d.abbreviation; });
    
    // Get academic years
    const academicYears = await db.collection('academicYears').find({}).toArray();
    console.log("\n=== ACADEMIC YEARS ===");
    academicYears.forEach(ay => {
      const deptAbbr = ay.departmentId ? deptMap[ay.departmentId.toString()] : 'N/A';
      console.log(`${ay._id}: ${ay.name} (${ay.abbreviation}) - Dept: ${deptAbbr}`);
    });
    
    // Problem subjects
    const problemCodes = ['315002', '315003', '313303', '313002'];
    
    console.log("\n=== PROBLEM SUBJECTS ANALYSIS ===\n");
    
    for (const code of problemCodes) {
      const subject = await db.collection('subjects').findOne({ subjectCode: code });
      if (!subject) {
        console.log(`❌ Subject ${code} NOT FOUND in subjects collection\n`);
        continue;
      }
      
      console.log(`\n📚 Subject: ${subject.name} (${code})`);
      console.log(`   Subject ID: ${subject._id}`);
      console.log(`   Subject's departmentId: ${subject.departmentId ? deptMap[subject.departmentId.toString()] : 'null'}`);
      console.log(`   Subject's academicYearId: ${subject.academicYearId}`);
      
      // Get departmentSubjects links
      const links = await db.collection('departmentSubjects').find({ 
        subjectId: subject._id.toString() 
      }).toArray();
      
      console.log(`   \n   departmentSubjects links (${links.length}):`);
      links.forEach(link => {
        const dept = link.departmentId ? deptMap[link.departmentId.toString()] : 'UNKNOWN';
        console.log(`      - Dept: ${dept}, AcademicYear: ${link.academicYearId}`);
      });
    }
    
  } finally {
    await client.close();
  }
}

diagnose().catch(err => { console.error('Diagnosis failed:', err); process.exit(1); });
