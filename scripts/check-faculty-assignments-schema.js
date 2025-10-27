const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGO_URI || "mongodb+srv://swapnilsonawane:TVDFjnMt9C97ieJO@cluster0.wqnku0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const dbName = process.env.DB_NAME || "feedbackPortal";

async function checkSchema() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    
    // Get New Working Subject
    const subject = await db.collection('subjects').findOne({ subjectCode: '777777' });
    console.log('\n=== SUBJECT ===');
    console.log(JSON.stringify(subject, null, 2));
    
    if (!subject) {
      console.log('Subject not found');
      return;
    }
    
    // Get ALL faculty assignments for this subject
    const assignments = await db.collection('facultyAssignments').find({
      subjectId: subject._id.toString()
    }).toArray();
    
    console.log('\n=== FACULTY ASSIGNMENTS ===');
    console.log(`Found ${assignments.length} assignments`);
    assignments.forEach(a => {
      console.log(JSON.stringify(a, null, 2));
    });
    
    // Check if departmentId field exists
    const hasDeptId = assignments.some(a => a.departmentId !== undefined);
    console.log(`\n❓ Has departmentId field: ${hasDeptId}`);
    
    if (!hasDeptId) {
      console.log('❌ BUG CONFIRMED: facultyAssignments missing departmentId field!');
    }
    
  } finally {
    await client.close();
  }
}

checkSchema().catch(err => {
  console.error('Error running check script:', err);
  process.exit(1);
});
