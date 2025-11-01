const fs = require('fs').promises;
const path = require('path');
const { MongoClient } = require('mongodb');

async function restoreSubjects() {
  try {
    // Connect to MongoDB
    const client = await MongoClient.connect(process.env.MONGODB_URI);
    const db = client.db();
    
    // Read backup files
    const backupPath = path.join(__dirname, '..', '..', 'backup', '2025-10-26T05-44-40-306Z');
    const subjectsData = JSON.parse(await fs.readFile(path.join(backupPath, 'subjects.json'), 'utf8'));
    
    // Clear existing collections
    await db.collection('subjects').deleteMany({});
    await db.collection('departmentSubjects').deleteMany({});
    
    if (subjectsData.length > 0) {
      // Insert subjects
      const result = await db.collection('subjects').insertMany(subjectsData);
      console.log(`Restored ${result.insertedCount} subjects`);
      
      // Create departmentSubjects mappings
      const departmentSubjects = subjectsData
        .filter(subject => subject.departmentId)
        .map(subject => ({
          departmentId: subject.departmentId,
          subjectId: subject._id || subject.id,
          academicYearId: subject.academicYearId,
          createdAt: new Date(),
          updatedAt: new Date()
        }));
      
      if (departmentSubjects.length > 0) {
        const mappingResult = await db.collection('departmentSubjects').insertMany(departmentSubjects);
        console.log(`Created ${mappingResult.insertedCount} department-subject mappings`);
      }
    }
    
    await client.close();
    console.log('Restoration completed successfully');
  } catch (error) {
    console.error('Error during restoration:', error);
    process.exit(1);
  }
}

restoreSubjects();