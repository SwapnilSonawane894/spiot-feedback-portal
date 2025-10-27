const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGO_URI || "mongodb+srv://swapnilsonawane:TVDFjnMt9C97ieJO@cluster0.wqnku0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const dbName = process.env.DB_NAME || "feedbackPortal";

async function deleteTestSubject() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    
    // Find test subject
    const testSubject = await db.collection('subjects').findOne({ 
      subjectCode: '1234',
      name: 'a'
    });
    
    if (!testSubject) {
      console.log('Test subject not found');
      return;
    }
    
    console.log(`Found test subject: ${testSubject.name} (${testSubject.subjectCode})`);
    
    // Delete departmentSubjects links
    const dsDeleted = await db.collection('departmentSubjects').deleteMany({
      subjectId: testSubject._id.toString()
    });
    console.log(`Deleted ${dsDeleted.deletedCount} departmentSubjects links`);
    
    // Delete facultyAssignments
    const faDeleted = await db.collection('facultyAssignments').deleteMany({
      subjectId: testSubject._id.toString()
    });
    console.log(`Deleted ${faDeleted.deletedCount} faculty assignments`);
    
    // Delete subject
    await db.collection('subjects').deleteOne({ _id: testSubject._id });
    console.log('✅ Test subject deleted');
    
  } finally {
    await client.close();
  }
}

deleteTestSubject().catch(err => { console.error('Script failed:', err); process.exit(1); });
