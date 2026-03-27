import { MongoClient, ObjectId } from 'mongodb';

async function updateTawarePassword() {
  const mongoUrl = process.env.DATABASE_URL || 'mongodb://localhost:27017/FeedbackPortal2';
  const client = new MongoClient(mongoUrl);

  try {
    await client.connect();
    console.log('✓ Connected to MongoDB');

    const db = client.db();
    const newHash = '$2b$10$NKYbVT7001/SCzcQVVz9zuIguHGvAAqc5YpwREgUBRjOnYqP9REbW';

    // Update the user with email taware@gmail.com
    const result = await db.collection('users').updateOne(
      { email: 'taware@gmail.com' },
      { $set: { hashedPassword: newHash } }
    );

    if (result.matchedCount === 0) {
      console.log('❌ User "taware@gmail.com" not found');
      return;
    }

    console.log('✓ Password updated successfully');
    console.log(`  - Matched: ${result.matchedCount}`);
    console.log(`  - Modified: ${result.modifiedCount}`);
    console.log('\n📝 Test login credentials:');
    console.log('   Email: taware@gmail.com');
    console.log('   Password: taware');

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
  } finally {
    await client.close();
    process.exit(0);
  }
}

updateTawarePassword();
