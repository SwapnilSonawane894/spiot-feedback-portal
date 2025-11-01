#!/usr/bin/env node
const { MongoClient, ObjectId } = require('mongodb');

async function createIndexIfNotExists(collection, indexSpec) {
  try {
    await collection.createIndex(indexSpec);
    console.log(`Created index on ${collection.collectionName}`);
  } catch (error) {
    if (error.code === 85) { // Index already exists
      console.log(`Index already exists on ${collection.collectionName}`);
    } else {
      throw error;
    }
  }
}

async function fixDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI environment variable is required');
    process.exit(1);
  }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    const db = client.db('feedbackPortal');

        // 1. Skip index creation as they already exist
    console.log('\nSkipping index creation as they already exist');

    // 2. Ensure all department-subject links have proper academicYearId
    console.log('\nFixing department-subject links...');
    const deptSubjects = await db.collection('departmentSubjects').find({
      $or: [
        { academicYearId: { $exists: false } },
        { academicYearId: null }
      ]
    }).toArray();

    if (deptSubjects.length > 0) {
      console.log(`Found ${deptSubjects.length} department-subject links without academicYearId`);
      
      // Get subjects to find their academic years
      const subjects = await db.collection('subjects').find({
        _id: { $in: deptSubjects.map(ds => new ObjectId(ds.subjectId)) }
      }).toArray();
      
      const subjectMap = new Map(subjects.map(s => [s._id.toString(), s]));
      
      for (const ds of deptSubjects) {
        const subject = subjectMap.get(ds.subjectId);
        if (subject && subject.academicYearId) {
          await db.collection('departmentSubjects').updateOne(
            { _id: ds._id },
            { $set: { academicYearId: subject.academicYearId.toString() } }
          );
        }
      }
    }

    // 3. Update faculty assignments to ensure proper academicYear mapping
    console.log('\nFixing faculty assignments...');
    const assignments = await db.collection('facultyAssignments').find({}).toArray();
    
    for (const assignment of assignments) {
      // Get the subject's department-subject junction
      const deptSubject = await db.collection('departmentSubjects').findOne({
        subjectId: assignment.subjectId,
        departmentId: assignment.departmentId
      });

      if (deptSubject && deptSubject.academicYearId !== assignment.academicYearId) {
        console.log(`Updating assignment ${assignment._id} academicYear to match department-subject link`);
        await db.collection('facultyAssignments').updateOne(
          { _id: assignment._id },
          { $set: { academicYearId: deptSubject.academicYearId } }
        );
      }
    }

    // 4. Verify and fix student assignments
    console.log('\nVerifying student assignments...');
    const students = await db.collection('users').find({ role: 'STUDENT' }).toArray();
    
    for (const student of students) {
      const studentTasks = await db.collection('facultyAssignments').find({
        departmentId: student.departmentId,
        academicYearId: student.academicYearId
      }).toArray();

      console.log(`Student ${student.email}: Found ${studentTasks.length} valid assignments`);
    }

    console.log('\nDatabase fixes completed successfully');

  } catch (error) {
    console.error('Error fixing database:', error);
  } finally {
    await client.close();
  }
}

fixDatabase().catch(console.error);