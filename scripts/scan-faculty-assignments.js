const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGO_URI || "mongodb+srv://swapnilsonawane:TVDFjnMt9C97ieJO@cluster0.wqnku0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const dbName = process.env.DB_NAME || "feedbackPortal";

async function scanAssignments() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    
    console.log('\n=== SCANNING FACULTY ASSIGNMENTS ===\n');
    
    // Get ALL faculty assignments
    const allAssignments = await db.collection('facultyAssignments').find({}).toArray();
    console.log(`Total facultyAssignments: ${allAssignments.length}`);
    
    // Check for departmentId field
    const withDeptId = allAssignments.filter(a => a.departmentId !== undefined && a.departmentId !== null);
    const withoutDeptId = allAssignments.filter(a => a.departmentId === undefined || a.departmentId === null);
    
    console.log(`\n✅ With departmentId: ${withDeptId.length}`);
    console.log(`❌ WITHOUT departmentId: ${withoutDeptId.length}`);
    
    if (withoutDeptId.length > 0) {
      console.log('\n❌ BUG CONFIRMED: Missing departmentId in facultyAssignments!');
      console.log('\nSample assignments WITHOUT departmentId:');
      withoutDeptId.slice(0, 3).forEach(a => {
        console.log(JSON.stringify(a, null, 2));
      });
    }
    
    // Find shared subjects (subjects with multiple departmentSubjects)
    const deptSubjects = await db.collection('departmentSubjects').find({}).toArray();
    const subjectCounts = {};
    deptSubjects.forEach(ds => {
      subjectCounts[ds.subjectId] = (subjectCounts[ds.subjectId] || 0) + 1;
    });
    
    const sharedSubjects = Object.entries(subjectCounts)
      .filter(([_, count]) => count > 1)
      .map(([subjectId, count]) => ({ subjectId, deptCount: count }));
    
    console.log(`\n📊 Found ${sharedSubjects.length} shared subjects (used by multiple departments)`);
    
    // Check if shared subjects have multiple faculty assignments
    for (const { subjectId, deptCount } of sharedSubjects.slice(0, 10)) {
      let subject = null;
      try {
        subject = await db.collection('subjects').findOne({ _id: new ObjectId(subjectId) });
      } catch (e) {
        // subjectId might be stored as string _id alternative
        subject = await db.collection('subjects').findOne({ _id: subjectId }) || await db.collection('subjects').findOne({ id: subjectId }) || { name: 'Unknown', subjectCode: 'N/A' };
      }
      const assignments = await db.collection('facultyAssignments').find({ subjectId }).toArray();
      
      console.log(`\n📌 ${subject?.name || 'Unknown'} (${subject?.subjectCode || 'N/A'})`);
      console.log(`   Used by ${deptCount} departments`);
      console.log(`   Has ${assignments.length} faculty assignments`);
      
      if (assignments.length > 0) {
        assignments.forEach(a => {
          console.log(`   - Faculty: ${a.facultyId}, Has departmentId: ${!!a.departmentId}, departmentId: ${a.departmentId || '<<missing>>'}`);
        });
      }
    }
    
    console.log('\n=== DIAGNOSTIC COMPLETE ===');
    
  } finally {
    await client.close();
  }
}

scanAssignments().catch(err => {
  console.error('Error running scan script:', err);
  process.exit(1);
});
