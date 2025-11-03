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
    
    const db = client.db('FeedbackPortal2');
    console.log('Using database:', db.databaseName);
    
    // List current indexes
    console.log('\nCurrent indexes on subjects collection:');
    const currentIndexes = await db.collection('subjects').listIndexes().toArray();
    console.log(JSON.stringify(currentIndexes, null, 2));
    
    // Drop old indexes
    console.log('\nDropping old indexes...');
    try {
      await db.collection('subjects').dropIndex('unique_dept_subject_code');
      console.log('✅ Dropped old unique_dept_subject_code index');
    } catch (e) {
      console.log('Note: unique_dept_subject_code index not found');
    }
    
    // Create new compound index for the new schema
    console.log('\nCreating new index...');
    await db.collection('subjects').createIndex(
      {
        subjectCode: 1,
        departmentIds: 1
      },
      {
        unique: true,
        name: 'unique_subject_code_per_department',
        partialFilterExpression: {
          subjectCode: { $exists: true },
          departmentIds: { $exists: true }
        }
      }
    );
    console.log('✅ Created new unique_subject_code_per_department index');
    
    // Verify new indexes
    console.log('\nNew indexes on subjects collection:');
    const newIndexes = await db.collection('subjects').listIndexes().toArray();
    console.log(JSON.stringify(newIndexes, null, 2));
    
    console.log('\n✅ Index update completed successfully!');
    
  } catch (error) {
    console.error('Failed:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

main().catch(console.error);