// Simple update script using mongodb driver directly
import pkg from './package.json' assert { type: 'json' };

const mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/FeedbackPortal2';
let mongo;

try {
  // Use dynamic import to get mongodb
  const { MongoClient } = await import('mongodb');
  mongo = MongoClient;
} catch (e) {
  console.error('MongoDB driver not found. Trying alternative...');
  console.log('\nManual Update Instructions:');
  console.log('=============================\n');
  console.log('Use MongoDB Compass or mongosh to run this command:\n');
  console.log('db.users.updateOne(');
  console.log('  { email: "taware@gmail.com" },');
  console.log('  { $set: { hashedPassword: "$2b$10$NKYbVT7001/SCzcQVVz9zuIguHGvAAqc5YpwREgUBRjOnYqP9REbW" } }');
  console.log(');\n');
  process.exit(1);
}

async function update() {
  const client = new mongo(mongoUri);
  try {
    await client.connect();
    const db = client.db('FeedbackPortal2');
    
    const result = await db.collection('users').updateOne(
      { email: 'taware@gmail.com' },
      { $set: { hashedPassword: '$2b$10$NKYbVT7001/SCzcQVVz9zuIguHGvAAqc5YpwREgUBRjOnYqP9REbW' } }
    );

    if (result.matchedCount === 0) {
      console.log('❌ User not found');
      return;
    }

    console.log('✓ Password updated successfully!');
    console.log(`  - Matched: ${result.matchedCount}`);
    console.log(`  - Modified: ${result.modifiedCount}`);
    console.log('\n📝 Login with: taware@gmail.com / taware');
  } finally {
    await client.close();
  }
}

update().catch(err => {
  console.error('Error:', err.message);
  console.log('\nManual Update Instructions:');
  console.log('=============================\n');
  console.log('Use MongoDB Compass or mongosh to run:\n');
  console.log('db.users.updateOne(');
  console.log('  { email: "taware@gmail.com" },');
  console.log('  { $set: { hashedPassword: "$2b$10$NKYbVT7001/SCzcQVVz9zuIguHGvAAqc5YpwREgUBRjOnYqP9REbW" } }');
  console.log(');\n');
  process.exit(1);
});
