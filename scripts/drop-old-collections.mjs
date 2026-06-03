import { MongoClient } from 'mongodb';
import { config } from 'dotenv';

// Load environment variables
config();

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI environment variable is required');
  process.exit(1);
}

async function main() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');

    // Use FeedbackPortal2 database explicitly
    const db = client.db('FeedbackPortal2');
    console.log('Using database:', db.databaseName);
    
    // Drop the departmentSubjects collection
    try {
      await db.collection('departmentSubjects').drop();
      console.log('✅ Successfully dropped departmentSubjects collection');
    } catch (error) {
      if (error.code === 26) {
        console.log('ℹ️ departmentSubjects collection does not exist (already removed)');
      } else {
        throw error;
      }
    }
    
    console.log('✅ Cleanup completed successfully!');
    
  } catch (error) {
    console.error('Cleanup failed:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

main().catch(console.error);