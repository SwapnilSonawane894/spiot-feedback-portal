// @ts-check
import { MongoClient } from 'mongodb';

const uri = "mongodb+srv://swapnilsonawane:TVDFjnMt9C97ieJO@cluster0.wqnku0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const dbName = 'FeedbackPortal2';

async function fixSubjectIndexes() {
  const client = await MongoClient.connect(uri);
  const db = client.db(dbName);

  try {
    // Drop existing index if any
    await db.collection('subjects').dropIndex('subjectCode_1').catch(() => {});
    await db.collection('subjects').dropIndex('departmentId_1_subjectCode_1').catch(() => {});

    // Create new compound index
    await db.collection('subjects').createIndex(
      { departmentId: 1, subjectCode: 1 },
      { 
        unique: true,
        name: 'unique_dept_subject_code' 
      }
    );
    console.log('Created unique compound index on subjects.departmentId and subjects.subjectCode');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

fixSubjectIndexes().catch(console.error);