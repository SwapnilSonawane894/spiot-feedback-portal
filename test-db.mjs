import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;

async function testDB() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✓ Connected to MongoDB');
    
    const db = client.db('feedbackPortal');
    
    // Count users
    const userCount = await db.collection('users').countDocuments();
    console.log(`\n✓ Found ${userCount} users in database`);
    
    // Get sample users
    const users = await db.collection('users').find({}).limit(10).toArray();
    console.log('\nUser samples:');
    users.forEach((user, i) => {
      console.log(`\n${i + 1}. Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Has password: ${!!user.hashedPassword}`);
      console.log(`   ID: ${user._id}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

testDB();
