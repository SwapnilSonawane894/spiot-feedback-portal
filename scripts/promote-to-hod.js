// This script promotes a faculty member to HOD role

const { MongoClient } = require('mongodb');

async function promoteToHod(email) {
  try {
    const client = await MongoClient.connect('mongodb://localhost:27017');
    const db = client.db('feedbackPortal');

    // 1. Update user role to HOD
    const result = await db.collection('users').updateOne(
      { email },
      { $set: { role: 'HOD' } }
    );

    if (result.modifiedCount === 1) {
      console.log(`Successfully promoted user ${email} to HOD role`);
    } else {
      console.log(`No user found with email ${email}`);
    }

    await client.close();
  } catch (error) {
    console.error('Error promoting user to HOD:', error);
  }
}

// Usage: provide the email of faculty to promote
const email = process.argv[2];
if (!email) {
  console.error('Please provide faculty email as argument');
  process.exit(1);
}

promoteToHod(email);