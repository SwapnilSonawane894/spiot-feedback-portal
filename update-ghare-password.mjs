import { MongoClient } from 'mongodb';

const mongoUri = 'mongodb+srv://swapnilsonawane:TVDFjnMt9C97ieJO@cluster0.wqnku0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

async function updateGharePassword() {
  const client = new MongoClient(mongoUri);

  try {
    console.log('🔗 Connecting to MongoDB Atlas...');
    await client.connect();
    console.log('✓ Connected successfully\n');

    const db = client.db('FeedbackPortal2');
    const newHash = '$2b$10$RoeEHDbKnV0n4b1w6qzkh.s4ZNc34NEQp2LLi82JN.Ji9DO7.61UK';

    console.log('📝 Updating ghare\'s password...');
    const result = await db.collection('users').updateOne(
      { email: 'ghare@gmail.com' },
      { $set: { hashedPassword: newHash } }
    );

    if (result.matchedCount === 0) {
      console.log('❌ User "ghare@gmail.com" not found in database');
      process.exit(1);
    }

    console.log('✓ Password updated successfully!\n');
    console.log(`  - Documents matched: ${result.matchedCount}`);
    console.log(`  - Documents modified: ${result.modifiedCount}`);
    console.log('\n✨ You can now login with:');
    console.log('   Email: ghare@gmail.com');
    console.log('   Password: ghare\n');

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  } finally {
    await client.close();
    console.log('✓ Connection closed');
    process.exit(0);
  }
}

updateGharePassword();
