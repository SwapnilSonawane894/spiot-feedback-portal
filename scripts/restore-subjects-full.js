const fs = require('fs');
const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');

// MongoDB connection URI from environment variable
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('Please provide MONGODB_URI environment variable');
  process.exit(1);
}

async function main() {
  console.log('Starting subjects and department-subjects restoration...');
  
  const client = await MongoClient.connect(uri);
  try {
    const db = client.db();
    
    // 1. First restore subjects from backup
    console.log('Reading subjects from backup...');
    const subjectsFile = path.join(__dirname, '..', '..', 'backup/2025-10-26T05-44-40-306Z/subjects.json');
    const subjectsData = JSON.parse(fs.readFileSync(subjectsFile, 'utf8'));
    console.log(`Found ${subjectsData.length} subjects in backup file`);

    // Clear existing subjects
    await db.collection('subjects').deleteMany({});
    console.log('Cleared existing subjects');

    // Insert subjects with proper ObjectIds
    const subjects = subjectsData.map(subject => ({
      ...subject,
      _id: new ObjectId(subject._id),
      createdAt: new Date(subject.createdAt),
      updatedAt: subject.updatedAt ? new Date(subject.updatedAt) : new Date()
    }));

    const subjectResult = await db.collection('subjects').insertMany(subjects);
    console.log(`Restored ${subjectResult.insertedCount} subjects`);

    // 2. Now create department-subject mappings
    console.log('\nCreating department-subject mappings...');
    
    // Clear existing mappings
    await db.collection('departmentSubjects').deleteMany({});
    console.log('Cleared existing department-subject mappings');

    const mappings = [];
    
    // Create department-subjects mappings for each subject
    for (const subject of subjects) {
      const subjectId = subject._id.toString();
      
      // If subject has departmentIds array, create mapping for each department
      if (Array.isArray(subject.departmentIds)) {
        for (const deptId of subject.departmentIds) {
          mappings.push({
            _id: new ObjectId(),
            departmentId: String(deptId),
            subjectId: subjectId,
            academicYearId: String(subject.academicYearId),
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }
      }
      // Otherwise use the single departmentId
      else if (subject.departmentId) {
        mappings.push({
          _id: new ObjectId(),
          departmentId: String(subject.departmentId),
          subjectId: subjectId,
          academicYearId: String(subject.academicYearId),
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    }

    if (mappings.length > 0) {
      const result = await db.collection('departmentSubjects').insertMany(mappings);
      console.log(`Created ${result.insertedCount} department-subject mappings`);
    }

    // Verify the restoration
    const subjectCount = await db.collection('subjects').countDocuments();
    const deptSubjectCount = await db.collection('departmentSubjects').countDocuments();
    
    console.log('\nVerification:');
    console.log(`Subjects in database: ${subjectCount}`);
    console.log(`Department-subject mappings in database: ${deptSubjectCount}`);

    // Log some sample data
    console.log('\nSample subjects:');
    const sampleSubjects = await db.collection('subjects').find().limit(2).toArray();
    console.log(JSON.stringify(sampleSubjects, null, 2));

    console.log('\nSample mappings:');
    const sampleMappings = await db.collection('departmentSubjects').find().limit(2).toArray();
    console.log(JSON.stringify(sampleMappings, null, 2));

  } catch (error) {
    console.error('Error during restoration:', error);
    process.exit(1);
  } finally {
    await client.close();
  }

  console.log('\nRestoration completed successfully');
}

main().catch(console.error);