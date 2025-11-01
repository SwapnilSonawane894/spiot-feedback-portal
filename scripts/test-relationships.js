// @ts-check
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = 'FeedbackPortal2';

async function testRelationships() {
  const client = await MongoClient.connect(uri);
  const db = client.db(dbName);

  // 1. Test admin user
  const adminUser = await db.collection('users').findOne({ email: 'admin@gmail.com' });
  console.log('Admin user:', adminUser ? 'Found' : 'Not found');

  // 2. Test departments and their subjects
  const departments = await db.collection('departments').find().toArray();
  console.log(`Found ${departments.length} departments`);

  for (const dept of departments) {
    // Find subjects for this department
    const subjects = await db.collection('subjects')
      .find({ departmentId: dept._id })
      .toArray();
    
    console.log(`Department ${dept.name} has ${subjects.length} subjects:`);
    subjects.forEach(subject => {
      console.log(`- ${subject.name} (${subject.subjectCode})`);
    });

    // Find academic years for this department
    const academicYears = await db.collection('academicYears')
      .find({ departmentId: dept._id })
      .toArray();
    
    console.log(`Department ${dept.name} has ${academicYears.length} academic years`);

    // Find settings for this department
    const settings = await db.collection('settings')
      .findOne({ departmentId: dept._id });
    
    console.log(`Department ${dept.name} settings:`, settings);
  }

  // 3. Test unique constraints
  console.log('\nTesting unique constraints...');
  try {
    // Try to create another admin user
    await db.collection('users').insertOne({
      email: 'admin@gmail.com',
      name: 'Duplicate Admin',
      hashedPassword: 'test',
      role: 'ADMIN',
      departmentId: null,
      academicYearId: null,
      createdAt: new Date()
    });
    console.error('❌ Unique email constraint failed');
  } catch (error) {
    console.log('✅ Unique email constraint working');
  }

  // 4. Test subject code uniqueness
  try {
    const existingSubject = await db.collection('subjects').findOne();
    if (existingSubject) {
      await db.collection('subjects').insertOne({
        ...existingSubject,
        _id: undefined
      });
      console.error('❌ Unique subject code constraint failed');
    }
  } catch (error) {
    console.log('✅ Unique subject code constraint working');
  }

  await client.close();
}

testRelationships().catch(console.error);