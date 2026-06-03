import { MongoClient, ObjectId } from 'mongodb';

const uri = process.env.MONGODB_URI;

async function verifyUserStructure() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db('feedbackPortal');
    
    console.log('\nChecking user structure returned by docWithId transformation:\n');
    
    const doc = await db.collection('users').findOne({ email: 'admin@gmail.com' });
    
    console.log('Raw MongoDB document:');
    console.log(JSON.stringify(doc, null, 2));
    
    // Simulate docWithId transformation
    const { _id, ...rest } = doc;
    const transformed = { id: _id.toString(), ...rest };
    
    console.log('\nAfter docWithId transformation:');
    console.log(JSON.stringify(transformed, null, 2));
    
    console.log('\nChecking key fields:');
    console.log(`  id: ${transformed.id}`);
    console.log(`  role: ${transformed.role}`);
    console.log(`  email: ${transformed.email}`);
    console.log(`  name: ${transformed.name}`);
    console.log(`  hashedPassword: ${transformed.hashedPassword ? '[PRESENT]' : '[MISSING]'}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

verifyUserStructure();
