// @ts-check
import { MongoClient } from 'mongodb';

const uri = "mongodb+srv://swapnilsonawane:TVDFjnMt9C97ieJO@cluster0.wqnku0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const dbName = 'FeedbackPortal2';

async function setupSubjectIndexes() {
  const client = await MongoClient.connect(uri);
  const db = client.db(dbName);

  try {
    // Create a compound unique index on departmentId + subjectCode
    await db.collection('subjects').createIndex(
      { departmentId: 1, subjectCode: 1 },
      { 
        unique: true,
        name: 'unique_dept_subject_code' 
      }
    );
    console.log('Created unique compound index on subjects.departmentId and subjects.subjectCode');

    console.log('Subject index setup completed successfully');
  } catch (error) {
    console.error('Error setting up subject indexes:', error);
  } finally {
    await client.close();
  }
}

setupSubjectIndexes().catch(console.error);