const { MongoClient, ObjectId } = require('mongodb');

// MongoDB connection URI from environment variable
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('Please provide MONGODB_URI environment variable');
  process.exit(1);
}

async function main() {
  console.log('Starting department-subjects restoration...');
  
  const client = await MongoClient.connect(uri);
  try {
    const db = client.db();
    
    // First get all subjects
    const subjects = await db.collection('subjects').find().toArray();
    console.log(`Found ${subjects.length} subjects to process`);
    
    // Clear existing department-subjects mappings
    await db.collection('departmentSubjects').deleteMany({});
    
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
      console.log(`Restored ${result.insertedCount} department-subject mappings`);
    }

    // Verify the restoration
    const deptSubjectCount = await db.collection('departmentSubjects').countDocuments();
    
    console.log('\nVerification:');
    console.log(`Department-subject mappings in database: ${deptSubjectCount}`);

    // Log some sample mappings
    const sampleMappings = await db.collection('departmentSubjects').find().limit(5).toArray();
    console.log('\nSample mappings:');
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