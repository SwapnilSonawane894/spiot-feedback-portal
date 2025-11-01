const fs = require('fs');
const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');

// MongoDB connection URI from environment variable
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('Please provide MONGODB_URI environment variable');
  process.exit(1);
}

async function getBackupFiles() {
  const parentBackupPath = path.join(__dirname, '..', 'backup', '2025-10-26T05-44-40-306Z');
  let subjectsFile, departmentSubjectsFile;

  try {
    // Try to read subjects.json from parent backup
    if (fs.existsSync(path.join(parentBackupPath, 'subjects.json'))) {
      console.log('Found subjects backup in parent directory');
      subjectsFile = JSON.parse(fs.readFileSync(path.join(parentBackupPath, 'subjects.json'), 'utf8'));
      console.log(`Found ${subjectsFile.length} subjects in backup`);
    }
    
    // Try to read all_collections.json for departmentSubjects
    if (fs.existsSync(path.join(parentBackupPath, 'all_collections.json'))) {
      console.log('Found all_collections backup in parent directory');
      const data = JSON.parse(fs.readFileSync(path.join(parentBackupPath, 'all_collections.json'), 'utf8'));
      departmentSubjectsFile = data.departmentSubjects;
      if (departmentSubjectsFile) {
        console.log(`Found ${departmentSubjectsFile.length} department-subject mappings in backup`);
      }
    }

    if (!subjectsFile || !departmentSubjectsFile) {
      console.error('Could not find required backup files');
      process.exit(1);
    }

    return { subjectsFile, departmentSubjectsFile };
  } catch (error) {
    console.error('Error reading backup files:', error);
    process.exit(1);
  }
}

async function main() {
  console.log('Starting subjects and department-subjects restoration...');
  
  const { subjectsFile, departmentSubjectsFile } = await getBackupFiles();
  
  if (!subjectsFile || !departmentSubjectsFile) {
    console.error('Could not find required data in backup');
    process.exit(1);
  }

  const client = await MongoClient.connect(uri);
  try {
    const db = client.db();
    
    // Clear existing data
    console.log('Clearing existing data...');
    await db.collection('subjects').deleteMany({});
    await db.collection('departmentSubjects').deleteMany({});

    // Prepare subjects data
    const subjects = subjectsFile.map(subject => ({
      ...subject,
      _id: new ObjectId(subject._id),
      createdAt: new Date(subject.createdAt),
      updatedAt: subject.updatedAt ? new Date(subject.updatedAt) : new Date(),
      academicYearId: subject.academicYearId ? String(subject.academicYearId) : null
    }));

    // Insert subjects
    const subjectsResult = await db.collection('subjects').insertMany(subjects);
    console.log(`Restored ${subjectsResult.insertedCount} subjects`);

    // Prepare department subjects data
    const departmentSubjects = departmentSubjectsFile.map(ds => ({
      ...ds,
      _id: new ObjectId(ds._id),
      createdAt: new Date(ds.createdAt),
      updatedAt: ds.updatedAt ? new Date(ds.updatedAt) : new Date(),
      subjectId: String(ds.subjectId),
      departmentId: String(ds.departmentId),
      academicYearId: ds.academicYearId ? String(ds.academicYearId) : null
    }));

    // Insert department subjects
    const deptSubjectsResult = await db.collection('departmentSubjects').insertMany(departmentSubjects);
    console.log(`Restored ${deptSubjectsResult.insertedCount} department-subject mappings`);

    // Verify restoration
    const subjectCount = await db.collection('subjects').countDocuments();
    const deptSubjectCount = await db.collection('departmentSubjects').countDocuments();
    
    console.log('\nVerification:');
    console.log(`Subjects in database: ${subjectCount}`);
    console.log(`Department-subject mappings in database: ${deptSubjectCount}`);

  } catch (error) {
    console.error('Error during restoration:', error);
    process.exit(1);
  } finally {
    await client.close();
  }

  console.log('\nRestoration completed successfully');
}

main().catch(console.error);