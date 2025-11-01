// @ts-check
import { MongoClient, ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';

const uri = "mongodb+srv://swapnilsonawane:TVDFjnMt9C97ieJO@cluster0.wqnku0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const dbName = 'FeedbackPortal2';

async function setupDatabase() {
  const client = await MongoClient.connect(uri);
  const db = client.db(dbName);

  // Clear existing collections
  const collections = await db.listCollections().toArray();
  for (const collection of collections) {
    await db.collection(collection.name).drop();
  }

  // Create collections first
  await db.createCollection('users');
  await db.createCollection('departments');
  await db.createCollection('staff');
  await db.createCollection('academicYears');
  await db.createCollection('subjects');
  await db.createCollection('facultyAssignments');
  await db.createCollection('feedback');
  await db.createCollection('hodSuggestions');
  await db.createCollection('settings');
  await db.createCollection('securityLogs');

  // Create admin user only
  const hashedPassword = await bcrypt.hash('123', 10);
  const adminUser = await db.collection('users').insertOne({
    email: 'admin@gmail.com',
    name: 'System Administrator',
    hashedPassword,
    role: 'ADMIN',
    departmentId: null,  // Admin has no department
    academicYearId: null,
    createdAt: new Date()
  });

  // Create all necessary indexes
  try {
    // Users collection indexes
    await db.collection('users').createIndex({ "email": 1 }, { unique: true });
    await db.collection('users').createIndex({ "departmentId": 1 });
    await db.collection('users').createIndex({ "academicYearId": 1 });
    await db.collection('users').createIndex({ "role": 1 });

    // Departments collection indexes
    await db.collection('departments').createIndex({ "name": 1 }, { unique: true });
    await db.collection('departments').createIndex({ "abbreviation": 1 }, { unique: true });

    // Staff collection indexes
    await db.collection('staff').createIndex({ "userId": 1 }, { unique: true });
    await db.collection('staff').createIndex({ "departmentId": 1 });
    await db.collection('staff').createIndex({ "employeeId": 1 }, { unique: true });

    // Academic years collection indexes
    await db.collection('academicYears').createIndex({ 
      "departmentId": 1, 
      "abbreviation": 1 
    }, { unique: true });

    // Subjects collection indexes
    await db.collection('subjects').createIndex({ "subjectCode": 1 }, { unique: true });
    await db.collection('subjects').createIndex({ "departmentId": 1 });
    await db.collection('subjects').createIndex({ 
      "departmentId": 1, 
      "subjectCode": 1 
    }, { unique: true });

    // Faculty assignments collection indexes
    await db.collection('facultyAssignments').createIndex({
      "departmentId": 1,
      "staffId": 1,
      "subjectId": 1,
      "semester": 1,
      "academicYearId": 1
    }, { unique: true });
    await db.collection('facultyAssignments').createIndex({ "staffId": 1 });
    await db.collection('facultyAssignments').createIndex({ "subjectId": 1 });
    await db.collection('facultyAssignments').createIndex({ "academicYearId": 1 });

    // Feedback collection indexes
    await db.collection('feedback').createIndex({
      "studentId": 1,
      "assignmentId": 1
    }, { unique: true });
    await db.collection('feedback').createIndex({ "assignmentId": 1 });
    await db.collection('feedback').createIndex({ "submittedAt": 1 });

    // HOD Suggestions collection indexes
    await db.collection('hodSuggestions').createIndex({
      "staffId": 1,
      "semester": 1
    }, { unique: true });

    // Settings collection indexes
    await db.collection('settings').createIndex({ 
      "departmentId": 1, 
      "type": 1 
    }, { unique: true });

    // Security logs collection indexes
    await db.collection('securityLogs').createIndex({ "userId": 1 });
    await db.collection('securityLogs').createIndex({ "timestamp": 1 }, { expireAfterSeconds: 7776000 }); // 90 days TTL
    await db.collection('securityLogs').createIndex({ "type": 1 });

    console.log('Database setup completed successfully:');
    console.log('1. Created all collections');
    console.log('2. Created admin user with email: admin@gmail.com and password: 123');
    console.log('3. Set up all necessary indexes');
    
  } catch (error) {
    console.error('Error setting up database:', error);
  } finally {
    await client.close();
  }
}

setupDatabase().catch(console.error);