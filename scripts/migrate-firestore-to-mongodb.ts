#!/usr/bin/env tsx

/**
 * Migration Script: Firestore to MongoDB
 * 
 * This script clones all collections and documents from Firebase Firestore
 * to MongoDB while preserving the data structure and relationships.
 */

import admin from 'firebase-admin';
import { MongoClient, Db } from 'mongodb';

// Initialize Firebase Admin
const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!serviceAccountKey) {
  throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is required');
}

const serviceAccount = JSON.parse(serviceAccountKey);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const firestore = admin.firestore();

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is required');
}

// Collections to migrate
const COLLECTIONS = [
  'users',
  'departments',
  'academicYears',
  'staff',
  'subjects',
  'facultyAssignments',
  'feedback',
  'hodSuggestions'
];

/**
 * Fetch all documents from a Firestore collection
 */
async function getFirestoreCollection(collectionName: string) {
  console.log(`\n📥 Fetching Firestore collection: ${collectionName}`);
  const snapshot = await firestore.collection(collectionName).get();
  
  const documents = snapshot.docs.map(doc => ({
    _id: doc.id, // Use Firestore doc ID as MongoDB _id
    ...doc.data(),
    // Store original Firestore timestamps
    ...(doc.createTime && { _firestoreCreateTime: doc.createTime.toDate() }),
    ...(doc.updateTime && { _firestoreUpdateTime: doc.updateTime.toDate() })
  }));
  
  console.log(`   Found ${documents.length} documents`);
  return documents;
}

/**
 * Insert documents into MongoDB collection
 */
async function insertToMongoDB(db: Db, collectionName: string, documents: any[]) {
  if (documents.length === 0) {
    console.log(`   ⏭️  Skipping ${collectionName} (no documents)`);
    return;
  }

  console.log(`\n📤 Inserting into MongoDB collection: ${collectionName}`);
  
  // Drop existing collection if it exists (clean migration)
  try {
    await db.collection(collectionName).drop();
    console.log(`   🗑️  Dropped existing collection`);
  } catch (error: any) {
    if (error.codeName !== 'NamespaceNotFound') {
      console.log(`   ⚠️  Warning: ${error.message}`);
    }
  }

  // Insert all documents
  const result = await db.collection(collectionName).insertMany(documents);
  console.log(`   ✅ Inserted ${result.insertedCount} documents`);
}

/**
 * Create indexes for MongoDB collections to optimize queries
 */
async function createIndexes(db: Db) {
  console.log('\n🔧 Creating MongoDB indexes...');

  // Users collection indexes
  await db.collection('users').createIndex({ email: 1 }, { unique: true });
  await db.collection('users').createIndex({ role: 1 });
  await db.collection('users').createIndex({ departmentId: 1 });
  await db.collection('users').createIndex({ academicYearId: 1 });
  console.log('   ✅ Created indexes for users');

  // Staff collection indexes
  await db.collection('staff').createIndex({ userId: 1 }, { unique: true });
  await db.collection('staff').createIndex({ departmentId: 1 });
  console.log('   ✅ Created indexes for staff');

  // Subjects collection indexes
  await db.collection('subjects').createIndex({ subjectCode: 1 });
  await db.collection('subjects').createIndex({ departmentId: 1 });
  await db.collection('subjects').createIndex({ targetYear: 1 });
  console.log('   ✅ Created indexes for subjects');

  // Faculty Assignments indexes
  await db.collection('facultyAssignments').createIndex({ staffId: 1 });
  await db.collection('facultyAssignments').createIndex({ subjectId: 1 });
  await db.collection('facultyAssignments').createIndex({ semester: 1 });
  await db.collection('facultyAssignments').createIndex({ staffId: 1, subjectId: 1, semester: 1 });
  console.log('   ✅ Created indexes for facultyAssignments');

  // Feedback collection indexes
  await db.collection('feedback').createIndex({ studentId: 1 });
  await db.collection('feedback').createIndex({ assignmentId: 1 });
  await db.collection('feedback').createIndex({ studentId: 1, assignmentId: 1 }, { unique: true });
  console.log('   ✅ Created indexes for feedback');

  // HOD Suggestions indexes
  await db.collection('hodSuggestions').createIndex({ staffId: 1 });
  await db.collection('hodSuggestions').createIndex({ hodId: 1 });
  await db.collection('hodSuggestions').createIndex({ semester: 1 });
  console.log('   ✅ Created indexes for hodSuggestions');

  // Departments and Academic Years indexes
  await db.collection('departments').createIndex({ name: 1 });
  await db.collection('academicYears').createIndex({ name: 1 });
  console.log('   ✅ Created indexes for departments and academicYears');
}

/**
 * Verify migration by counting documents
 */
async function verifyMigration(db: Db) {
  console.log('\n🔍 Verifying migration...\n');
  
  for (const collectionName of COLLECTIONS) {
    const firestoreCount = (await firestore.collection(collectionName).count().get()).data().count;
    const mongoCount = await db.collection(collectionName).countDocuments();
    
    const status = firestoreCount === mongoCount ? '✅' : '❌';
    console.log(`   ${status} ${collectionName}: Firestore=${firestoreCount}, MongoDB=${mongoCount}`);
  }
}

/**
 * Main migration function
 */
async function migrate() {
  console.log('🚀 Starting Firestore to MongoDB Migration\n');
  console.log('=' .repeat(60));
  
  const client = new MongoClient(MONGODB_URI!);

  try {
    // Connect to MongoDB
    console.log('\n🔌 Connecting to MongoDB...');
    await client.connect();
    console.log('   ✅ Connected to MongoDB');

    const db = client.db('spiot_feedback_portal'); // Database name

    // Migrate each collection
    for (const collectionName of COLLECTIONS) {
      const documents = await getFirestoreCollection(collectionName);
      await insertToMongoDB(db, collectionName, documents);
    }

    // Create indexes for optimization
    await createIndexes(db);

    // Verify the migration
    await verifyMigration(db);

    console.log('\n' + '='.repeat(60));
    console.log('🎉 Migration completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await client.close();
    console.log('🔌 MongoDB connection closed');
  }
}

// Run the migration
migrate().catch(console.error);
