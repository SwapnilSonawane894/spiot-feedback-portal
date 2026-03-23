const { MongoClient } = require('mongodb');

async function test() {
  const client = await MongoClient.connect("mongodb+srv://admin:admin@first.4ztdw.mongodb.net/FeedbackPortal2?retryWrites=true&w=majority&appName=First");
  const db = client.db();
  
  const staff = await db.collection("staff").find({}).limit(5).toArray();
  console.log("Staff docs:", JSON.stringify(staff, null, 2));
  
  process.exit(0);
}
test();
