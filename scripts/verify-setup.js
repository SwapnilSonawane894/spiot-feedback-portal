// @ts-check
import { MongoClient } from 'mongodb';

const uri = "mongodb+srv://swapnilsonawane:TVDFjnMt9C97ieJO@cluster0.wqnku0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const dbName = 'FeedbackPortal2';

async function verifySetup() {
  const client = await MongoClient.connect(uri);
  const db = client.db(dbName);

  try {
    // Check collections exist
    const collections = await db.listCollections().toArray();
    console.log('\nCollections in database:', collections.map(c => c.name).join(', '));

    // Check admin user
    const adminUser = await db.collection('users').findOne({ role: 'ADMIN' });
    console.log('\nAdmin user:', adminUser ? {
      email: adminUser.email,
      role: adminUser.role,
      name: adminUser.name,
      createdAt: adminUser.createdAt
    } : 'Not found');

    // Check indexes
    console.log('\nIndexes:');
    for (const collection of collections) {
      const indexes = await db.collection(collection.name).indexes();
      console.log(`\n${collection.name} indexes:`, indexes.map(idx => idx.name).join(', '));
    }

  } catch (error) {
    console.error('Error verifying setup:', error);
  } finally {
    await client.close();
  }
}

verifySetup().catch(console.error);