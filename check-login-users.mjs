import { MongoClient } from 'mongodb';
import bcrypt from 'bcrypt';

const uri = process.env.MONGODB_URI;

async function checkUsers() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db('feedbackPortal');
    
    const testUsers = [
      { email: 'admin@gmail.com', password: '123' },
      { email: 'kharat@gmail.com', password: 'kharat' },
      { email: 'bhosale@gmail.com', password: 'bhosale' }
    ];
    
    for (const testUser of testUsers) {
      console.log(`\n========================================`);
      console.log(`Testing: ${testUser.email}`);
      console.log(`========================================`);
      
      const user = await db.collection('users').findOne({ email: testUser.email });
      
      if (!user) {
        console.log('❌ User NOT FOUND in database');
        continue;
      }
      
      console.log(`✓ User found in database`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Role: ${user.role}`);
      console.log(`  Name: ${user.name || 'N/A'}`);
      console.log(`  Has hashedPassword: ${!!user.hashedPassword}`);
      
      if (user.hashedPassword) {
        const isValid = await bcrypt.compare(testUser.password, user.hashedPassword);
        console.log(`  Password '${testUser.password}' is: ${isValid ? '✓ CORRECT' : '❌ INCORRECT'}`);
      } else {
        console.log(`  ❌ No hashed password stored`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkUsers();
