// @ts-check
import { MongoClient, ObjectId } from 'mongodb';

const uri = "mongodb+srv://swapnilsonawane:TVDFjnMt9C97ieJO@cluster0.wqnku0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const dbName = 'FeedbackPortal2';

async function migrateSubjects() {
  const client = await MongoClient.connect(uri);
  const db = client.db(dbName);

  try {
    console.log('Starting subject data migration...');

    // 1. Backup both collections first
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const subjects = await db.collection('subjects').find({}).toArray();
    const junctions = await db.collection('departmentSubjects').find({}).toArray();
    
    await db.collection(`backup_subjects_${timestamp}`).insertMany(subjects);
    await db.collection(`backup_departmentSubjects_${timestamp}`).insertMany(junctions);
    console.log('Created backups');

    // 2. Convert subjects to include departmentIds array
    for (const subject of subjects) {
      // Find all department links for this subject
      const subjectLinks = junctions.filter(j => 
        String(j.subjectId) === String(subject._id)
      );

      // Get array of department IDs
      const departmentIds = subjectLinks.map(link => link.departmentId);
      
      // Update subject document with department IDs array
      await db.collection('subjects').updateOne(
        { _id: subject._id },
        {
          $set: {
            departmentIds: departmentIds,
            updatedAt: new Date()
          }
        }
      );
    }
    
    console.log('Updated subjects with department arrays');

    // 3. Drop the junction table since data is now in subjects
    await db.collection('departmentSubjects').drop();
    console.log('Dropped departmentSubjects collection');

    // 4. Create new indexes for efficient queries
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

migrateSubjects().catch(console.error);