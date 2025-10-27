const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGO_URI || "mongodb+srv://swapnilsonawane:TVDFjnMt9C97ieJO@cluster0.wqnku0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const dbName = process.env.DB_NAME || "feedbackPortal";

async function removeEmptySubjects() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    
    console.log('\n=== REMOVING EMPTY/INVALID SUBJECTS ===\n');
    
    // Find subjects with empty/null name or code
    const emptySubjects = await db.collection('subjects').find({
      $or: [
        { name: { $in: [null, '', undefined] } },
        { subjectCode: { $in: [null, '', undefined] } },
        { name: { $exists: false } },
        { subjectCode: { $exists: false } }
      ]
    }).toArray();
    
    console.log(`Found ${emptySubjects.length} empty/invalid subjects`);
    
    if (emptySubjects.length === 0) {
      console.log('✅ No empty subjects found!');
      return;
    }
    
    for (const subj of emptySubjects) {
      console.log(`\n❌ Removing: ${subj.name || 'NO NAME'} (${subj.subjectCode || 'NO CODE'})`);
      console.log(`   ID: ${subj._id}`);
      
      // Remove departmentSubjects links
      const deleted = await db.collection('departmentSubjects').deleteMany({
        subjectId: subj._id.toString()
      });
      console.log(`   Deleted ${deleted.deletedCount} departmentSubjects links`);
      
      // Remove facultyAssignments
      const fa = await db.collection('facultyAssignments').deleteMany({
        subjectId: subj._id.toString()
      });
      console.log(`   Deleted ${fa.deletedCount} faculty assignments`);
      
      // Remove subject
      await db.collection('subjects').deleteOne({ _id: subj._id });
      console.log(`   ✓ Subject removed`);
    }
    
    console.log(`\n✅ Cleanup complete!`);
    
  } finally {
    await client.close();
  }
}

removeEmptySubjects().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});
