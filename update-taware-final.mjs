import { MongoClient } from 'mongodb';

const mongoUri = 'mongodb+srv://swapnilsonawane:TVDFjnMt9C97ieJO@cluster0.wqnku0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

async function updateTawarePassword() {
  const client = new MongoClient(mongoUri);

  try {
    console.log('🔗 Connecting to MongoDB Atlas...');
    await client.connect();
    console.log('✓ Connected successfully\n');

    const db = client.db('FeedbackPortal2');
    const newHash = '$2b$10$NKYbVT7001/SCzcQVVz9zuIguHGvAAqc5YpwREgUBRjOnYqP9REbW';

    console.log('📝 Updating taware\'s password...');
    const result = await db.collection('users').updateOne(
      { email: 'taware@gmail.com' },
      { $set: { hashedPassword: newHash } }
    );

    if (result.matchedCount === 0) {
      console.log('❌ User "taware@gmail.com" not found in database');
      process.exit(1);
    }

    console.log('✓ Password updated successfully!\n');
    console.log(`  - Documents matched: ${result.matchedCount}`);
    console.log(`  - Documents modified: ${result.modifiedCount}`);
    console.log('\n✨ You can now login with:');
    console.log('   Email: taware@gmail.com');
    console.log('   Password: taware\n');

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  } finally {
    await client.close();
    console.log('✓ Connection closed');
    process.exit(0);
  }
}

updateTawarePassword();
