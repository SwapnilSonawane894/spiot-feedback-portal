import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;

async function checkStaff() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db('feedbackPortal');
    
    // Check staff collection
    const staffCount = await db.collection('staff').countDocuments();
    console.log(`\nFound ${staffCount} staff records\n`);
    
    const staffRecords = await db.collection('staff').find({}).limit(10).toArray();
    
    for (const staff of staffRecords) {
      console.log(`Staff ID: ${staff._id}`);
      console.log(`  User ID: ${staff.userId}`);
      console.log(`  Department ID: ${staff.departmentId}`);
      console.log(`  Is HOD: ${staff.isHOD || false}`);
      
      // Get user details
      const { ObjectId } = await import('mongodb');
      const user = await db.collection('users').findOne({ _id: new ObjectId(staff.userId) });
      if (user) {
        console.log(`  User Email: ${user.email}`);
        console.log(`  User Role: ${user.role}`);
        console.log(`  User Name: ${user.name}\n`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkStaff();
