const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://swapnilsonawane:TVDFjnMt9C97ieJO@cluster0.wqnku0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = process.env.DB_NAME || 'feedbackPortal';

async function deleteAllFacultyAssignments() {
  const client = new MongoClient(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db(DB_NAME);
    const assignmentsCollection = db.collection('facultyAssignments');

    // Count before deletion
    const countBefore = await assignmentsCollection.countDocuments();
    console.log(`📊 Total faculty assignments before deletion: ${countBefore}`);

    if (countBefore === 0) {
      console.log('ℹ️  No documents to delete. Exiting.');
    } else {
      // Delete ALL assignments
      const result = await assignmentsCollection.deleteMany({});
      console.log(`🗑️  Deleted ${result.deletedCount} faculty assignments`);

      // Verify deletion
      const countAfter = await assignmentsCollection.countDocuments();
      console.log(`📊 Total faculty assignments after deletion: ${countAfter}`);
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exitCode = 1;
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

if (require.main === module) {
  deleteAllFacultyAssignments();
}
