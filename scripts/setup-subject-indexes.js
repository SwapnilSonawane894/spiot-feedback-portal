// @ts-check
import { MongoClient } from 'mongodb';

const uri = "mongodb+srv://swapnilsonawane:TVDFjnMt9C97ieJO@cluster0.wqnku0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const dbName = 'FeedbackPortal2';

async function setupSubjectIndexes() {
  const client = await MongoClient.connect(uri);
  const db = client.db(dbName);

  try {
    // Drop any existing indexes on subjects collection except _id
    const indexes = await db.collection('subjects').indexes();
    for (const index of indexes) {
      if (index.name && index.name !== '_id_') {
        await db.collection('subjects').dropIndex(index.name);
      }
    }

    // Create a compound unique index on departmentId + subjectCode
    await db.collection('subjects').createIndex(
      { departmentId: 1, subjectCode: 1 },
      { 
        unique: true,
        name: 'unique_dept_subject_code' 
      }
    );
    console.log('Created unique compound index on subjects.departmentId and subjects.subjectCode');

    // Create index for academicYear and semester queries
    await db.collection('subjects').createIndex(
      { academicYearId: 1, semester: 1 },
      { name: 'academic_year_semester' }
    );
    console.log('Created index on subjects.academicYearId and subjects.semester');

    console.log('Subject index setup completed successfully');
  } catch (error) {
    console.error('Error setting up subject indexes:', error);
  } finally {
    await client.close();
  }
}

setupSubjectIndexes().catch(console.error);