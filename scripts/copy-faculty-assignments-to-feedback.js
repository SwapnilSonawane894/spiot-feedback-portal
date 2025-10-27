const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

async function copyAssignments() {
  const client = new MongoClient(MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
  });
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const wrongDb = client.db('feedbackPortal');
    const correctDb = client.db('feedback');
    
    const wrongCollection = wrongDb.collection('facultyAssignments');
    const correctCollection = correctDb.collection('facultyAssignments');
    
    // Get all assignments from wrong DB
    const allAssignments = await wrongCollection.find({}).toArray();
    console.log(`📦 Found ${allAssignments.length} total assignments in feedbackPortal\n`);
    
    if (allAssignments.length === 0) {
      console.log('⚠️  No assignments to copy!');
      return;
    }
    
    // Upsert into correct DB (keep original _id)
    const bulkOps = allAssignments.map(doc => ({
      replaceOne: {
        filter: { _id: doc._id },
        replacement: doc,
        upsert: true
      }
    }));
    
    const result = await correctCollection.bulkWrite(bulkOps);
    
    console.log('✅ Copy completed!');
    console.log(`  - Inserted: ${result.upsertedCount}`);
    console.log(`  - Updated: ${result.modifiedCount}`);
    console.log(`  - Total: ${allAssignments.length}\n`);
    
    // Verify CO department
    const coCount = await correctCollection.countDocuments({ 
      departmentId: '68f6390b641c7bcb2781b39c' 
    });
    console.log(`📊 CO assignments in feedback DB: ${coCount}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

copyAssignments();
