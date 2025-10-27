const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGO_URI || "mongodb+srv://swapnilsonawane:TVDFjnMt9C97ieJO@cluster0.wqnku0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const dbName = process.env.DB_NAME || "feedbackPortal";

async function checkNewSubject() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    
    // Find the newly created subject
    const subject = await db.collection('subjects').findOne({
      subjectCode: '888888'
    });
    
    console.log('\n=== SUBJECT DOCUMENT ===');
    console.log(JSON.stringify(subject, null, 2));
    
    if (!subject) {
      console.log('Subject not found!');
      return;
    }
    
    // Find its departmentSubjects entry
    const deptSubjects = await db.collection('departmentSubjects').find({
      subjectId: subject._id.toString()
    }).toArray();
    
    console.log('\n=== DEPARTMENT_SUBJECTS ENTRIES ===');
    console.log(`Found ${deptSubjects.length} entries`);
    deptSubjects.forEach(ds => {
      console.log(JSON.stringify(ds, null, 2));
    });
    
    // Check if CO department can find it
    const coDeptId = '68f6390b641c7bcb2781b39c';
    const coLinks = await db.collection('departmentSubjects').find({
      departmentId: coDeptId
    }).toArray();
    
    console.log('\n=== ALL CO DEPARTMENT LINKS ===');
    console.log(`Total: ${coLinks.length}`);
    
    const hasNew = coLinks.find(link => link.subjectId === subject._id.toString());
    if (hasNew) {
      console.log('✅ New subject IS linked to CO department');
      console.log(JSON.stringify(hasNew, null, 2));
    } else {
      console.log('❌ New subject NOT linked to CO department!');
    }
    
  } finally {
    await client.close();
  }
}

checkNewSubject().catch(err => {
  console.error('Error running check script:', err);
  process.exit(1);
});
