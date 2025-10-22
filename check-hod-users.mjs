import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;

async function checkHOD() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db('feedbackPortal');
    
    // Find all HOD users
    const hodUsers = await db.collection('users').find({ role: 'HOD' }).toArray();
    
    console.log(`\nFound ${hodUsers.length} HOD users:\n`);
    hodUsers.forEach((user, i) => {
      console.log(`${i + 1}. Email: ${user.email}`);
      console.log(`   Name: ${user.name || 'N/A'}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Has password: ${!!user.hashedPassword}\n`);
    });
    
    // Also check for STAFF role users
    const staffUsers = await db.collection('users').find({ role: 'STAFF' }).toArray();
    console.log(`\nFound ${staffUsers.length} STAFF users:\n`);
    staffUsers.forEach((user, i) => {
      console.log(`${i + 1}. Email: ${user.email}`);
      console.log(`   Name: ${user.name || 'N/A'}`);
      console.log(`   Role: ${user.role}\n`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkHOD();
