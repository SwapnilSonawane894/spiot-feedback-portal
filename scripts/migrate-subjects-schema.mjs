import { MongoClient, ObjectId } from 'mongodb';
import { config } from 'dotenv';
import path from 'path';
import fs from 'fs/promises';

// Load environment variables
config();

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI environment variable is required');
  process.exit(1);
}

async function backup(db) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(process.cwd(), 'backup', timestamp);
  
  // Create backup directory
  await fs.mkdir(backupDir, { recursive: true });
  
  // Backup subjects collection
  const subjects = await db.collection('subjects').find({}).toArray();
  await fs.writeFile(
    path.join(backupDir, 'subjects.json'), 
    JSON.stringify(subjects, null, 2)
  );
  
  // Backup departmentSubjects collection
  const deptSubjects = await db.collection('departmentSubjects').find({}).toArray();
  await fs.writeFile(
    path.join(backupDir, 'departmentSubjects.json'), 
    JSON.stringify(deptSubjects, null, 2)
  );
  
  console.log(`✅ Backup created in ${backupDir}`);
  return backupDir;
}

async function createUniqueIndexes(db) {
  // Drop old indexes if they exist
  try {
    await db.collection('subjects').dropIndex('subjectCode_1');
  } catch (e) {
    // Ignore if index doesn't exist
  }
  
  // Create new compound unique index
  await db.collection('subjects').createIndex(
    { 
      subjectCode: 1,
      departmentIds: 1
    },
    { 
      unique: true,
      name: 'unique_subject_code_per_department',
      partialFilterExpression: {
        subjectCode: { $exists: true },
        departmentIds: { $exists: true }
      }
    }
  );
  
  console.log('✅ Created new unique index on subjects collection');
}

async function migrateSubjects(db) {
  // Get all subjects and their department relationships
  const subjects = await db.collection('subjects').find({}).toArray();
  const deptSubjects = await db.collection('departmentSubjects').find({}).toArray();
  
  console.log(`Found ${subjects.length} subjects and ${deptSubjects.length} department-subject links`);
  
  // Build a map of subjectId -> departmentIds[]
  const subjectDepartments = new Map();
  for (const ds of deptSubjects) {
    const key = ds.subjectId.toString();
    if (!subjectDepartments.has(key)) {
      subjectDepartments.set(key, new Set());
    }
    subjectDepartments.get(key).add(ds.departmentId);
  }
  
  // Update each subject with departmentIds array
  let updated = 0;
  for (const subject of subjects) {
    const subjectId = subject._id.toString();
    const departmentIds = Array.from(subjectDepartments.get(subjectId) || []);
    
    if (departmentIds.length > 0) {
      await db.collection('subjects').updateOne(
        { _id: subject._id },
        { 
          $set: { 
            departmentIds: departmentIds,
            updatedAt: new Date()
          } 
        }
      );
      updated++;
    } else {
      console.warn(`⚠️ Warning: Subject ${subjectId} has no departments`);
    }
  }
  
  console.log(`✅ Updated ${updated} subjects with departmentIds arrays`);
}

async function verifyMigration(db) {
  // Check all subjects have departmentIds
  const subjectsWithoutDepts = await db.collection('subjects')
    .find({ departmentIds: { $exists: false } })
    .toArray();
  
  if (subjectsWithoutDepts.length > 0) {
    console.error('❌ Found subjects without departmentIds:', subjectsWithoutDepts.map(s => s._id));
    throw new Error('Migration verification failed');
  }
  
  // Check uniqueness constraint
  const subjects = await db.collection('subjects').find({}).toArray();
  const seen = new Set();
  const duplicates = [];
  
  for (const subject of subjects) {
    for (const deptId of (subject.departmentIds || [])) {
      const key = `${subject.subjectCode}:${deptId}`;
      if (seen.has(key)) {
        duplicates.push({ subjectCode: subject.subjectCode, departmentId: deptId });
      }
      seen.add(key);
    }
  }
  
  if (duplicates.length > 0) {
    console.error('❌ Found duplicate subject codes in departments:', duplicates);
    throw new Error('Migration verification failed');
  }
  
  console.log('✅ Migration verification passed');
}

async function main() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    
    // Step 1: Backup current data
    const backupDir = await backup(db);
    console.log('Step 1: Backup completed');
    
    // Step 2: Create new indexes
    await createUniqueIndexes(db);
    console.log('Step 2: Indexes updated');
    
    // Step 3: Migrate subject data
    await migrateSubjects(db);
    console.log('Step 3: Subject data migrated');
    
    // Step 4: Verify migration
    await verifyMigration(db);
    console.log('Step 4: Migration verified');
    
    // Step 5: Remove the junction table (optional - uncomment when ready)
    // await db.collection('departmentSubjects').drop();
    // console.log('Step 5: Junction table removed');
    
    console.log('✅ Migration completed successfully!');
    console.log(`💾 Backup available in: ${backupDir}`);
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

main().catch(console.error);