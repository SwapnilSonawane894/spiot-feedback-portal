// @ts-check
import { MongoClient, ObjectId } from 'mongodb';

const uri = "mongodb+srv://swapnilsonawane:TVDFjnMt9C97ieJO@cluster0.wqnku0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const dbName = 'FeedbackPortal2';

async function migrateSubjectStructure() {
  const client = await MongoClient.connect(uri);
  const db = client.db(dbName);

  try {
    console.log('Starting subject structure migration...');

    // 1. Create backup of both collections
    const subjects = await db.collection('subjects').find({}).toArray();
    const junctions = await db.collection('departmentSubjects').find({}).toArray();

    // Save backups
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await db.collection(`backup_subjects_${timestamp}`).insertMany(subjects);
    await db.collection(`backup_departmentSubjects_${timestamp}`).insertMany(junctions);
    
    console.log('Created backups of existing data');

    // 2. Create new subjects with department arrays
    const enrichedSubjects = [];
    for (const subject of subjects) {
      const subjectId = subject._id;
      const subjectJunctions = junctions.filter(j => 
        String(j.subjectId) === String(subjectId)
      );

      const departmentIds = subjectJunctions.map(j => j.departmentId);
      
      enrichedSubjects.push({
        ...subject,
        departmentIds,
        updatedAt: new Date()
      });
    }

    // 3. Drop old collections and create new one
    await db.collection('subjects').drop();
    await db.collection('departmentSubjects').drop();
    
    console.log('Dropped old collections');

    // 4. Insert enriched subjects
    await db.collection('subjects').insertMany(enrichedSubjects);
    
    console.log('Inserted enriched subjects');

    // 5. Create new indexes
    await db.collection('subjects').createIndex(
      { departmentIds: 1 },
      { name: 'department_lookup' }
    );

    await db.collection('subjects').createIndex(
      { "departmentIds": 1, "subjectCode": 1 },
      { 
        unique: true,
        name: 'unique_dept_subject_code',
        partialFilterExpression: {
          departmentIds: { $exists: true },
          subjectCode: { $exists: true }
        }
      }
    );

    await db.collection('subjects').createIndex(
      { academicYearId: 1, semester: 1 },
      { name: 'academic_year_semester' }
    );

    console.log('Created new indexes');
    console.log('Migration completed successfully');

  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  } finally {
    await client.close();
  }
}

migrateSubjectStructure().catch(console.error);