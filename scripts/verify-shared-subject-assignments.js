const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
const CO_DEPT_ID = '68f6390b641c7bcb2781b39c';
const EE_DEPT_ID = '68f6390b641c7bcb2781b39d';

async function verify() {
  const client = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    const db = client.db('feedback');
    const assignments = db.collection('facultyAssignments');
    const subjects = db.collection('subjects');
    
    // Find shared subjects
    const sharedSubjects = await subjects.find({
      subjectCode: { $in: ['315002', '315003', '313002'] }
    }).toArray();
    
    console.log('📚 Shared Subjects Found:', sharedSubjects.length);
    
    for (const subject of sharedSubjects) {
      console.log(`\n${subject.name || subject.subjectCode} (${subject.subjectCode}):`);
      
      // CO assignments
      const coAssignments = await assignments.countDocuments({
        subjectId: subject._id.toString(),
        departmentId: CO_DEPT_ID
      });
      console.log(`  CO assignments: ${coAssignments}`);
      
      // EE assignments
      const eeAssignments = await assignments.countDocuments({
        subjectId: subject._id.toString(),
        departmentId: EE_DEPT_ID
      });
      console.log(`  EE assignments: ${eeAssignments}`);
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.close();
  }
}

verify();
