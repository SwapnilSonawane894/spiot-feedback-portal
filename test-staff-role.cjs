const { MongoClient } = require('mongodb');

async function test() {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/FeedbackPortal2";
  const client = await MongoClient.connect(uri);
  const db = client.db();
  
  const staff = await db.collection("staff").find({}).limit(5).toArray();
  console.log("Staff docs:", JSON.stringify(staff, null, 2));
  
  process.exit(0);
}
test();
