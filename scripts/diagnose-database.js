#!/usr/bin/env node
const { MongoClient, ObjectId } = require('mongodb');

async function diagnoseDatabase() {
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

    // 1. Check academic years
    console.log('\n=== Academic Years ===');
    const academicYears = await db.collection('academicYears').find({}).toArray();
    console.log(`Found ${academicYears.length} academic years:`);
    academicYears.forEach(ay => {
      console.log(`- ${ay.name} (${ay._id})`);
    });

    // 2. Check departments
    console.log('\n=== Departments ===');
    const departments = await db.collection('departments').find({}).toArray();
    console.log(`Found ${departments.length} departments:`);
    departments.forEach(dept => {
      console.log(`- ${dept.name} (${dept._id})`);
    });

    // 3. Check subjects with their departments
    console.log('\n=== Subjects ===');
    const subjects = await db.collection('subjects').find({}).toArray();
    console.log(`Found ${subjects.length} subjects`);
    const subjectsWithoutDept = subjects.filter(s => !s.departmentId);
    console.log(`Subjects without departmentId: ${subjectsWithoutDept.length}`);
    if (subjectsWithoutDept.length > 0) {
      console.log('Sample subjects without department:');
      subjectsWithoutDept.slice(0, 5).forEach(s => {
        console.log(`- ${s.name} (${s._id})`);
      });
    }

    // 4. Check department-subject junctions
    console.log('\n=== Department-Subject Junctions ===');
    const deptSubjects = await db.collection('departmentSubjects').find({}).toArray();
    console.log(`Found ${deptSubjects.length} department-subject links`);
    
    // Sample check for one department
    if (departments.length > 0) {
      const sampleDept = departments[0];
      const deptLinks = deptSubjects.filter(ds => ds.departmentId === sampleDept._id.toString());
      console.log(`\nSample department "${sampleDept.name}" has ${deptLinks.length} subject links:`);
      for (const link of deptLinks.slice(0, 5)) {
        const subject = subjects.find(s => s._id.toString() === link.subjectId);
        console.log(`- Subject: ${subject?.name || 'Unknown'} (${link.subjectId})`);
        console.log(`  Academic Year: ${link.academicYearId || 'None'}`);
      }
    }

    // 5. Check faculty assignments
    console.log('\n=== Faculty Assignments ===');
    const assignments = await db.collection('facultyAssignments').find({}).toArray();
    console.log(`Found ${assignments.length} faculty assignments`);

    // Group by academic year
    const assignmentsByYear = {};
    assignments.forEach(a => {
      const yearId = a.academicYearId ? a.academicYearId.toString() : 'unknown';
      assignmentsByYear[yearId] = (assignmentsByYear[yearId] || 0) + 1;
    });
    
    console.log('\nAssignments by academic year:');
    for (const [yearId, count] of Object.entries(assignmentsByYear)) {
      const year = academicYears.find(ay => ay._id.toString() === yearId);
      console.log(`- ${year ? year.name : yearId}: ${count} assignments`);
    }

    // 6. Check for data inconsistencies
    console.log('\n=== Data Consistency Checks ===');

    // Check for assignments with missing subjects
    const orphanedAssignments = assignments.filter(a => 
      !subjects.some(s => s._id.toString() === a.subjectId)
    );
    console.log(`Assignments with missing subjects: ${orphanedAssignments.length}`);

    // Check for assignments with missing academic years
    const assignmentsWithoutYear = assignments.filter(a => !a.academicYearId);
    console.log(`Assignments without academic year: ${assignmentsWithoutYear.length}`);

    // Check for assignments with missing departments
    const assignmentsWithoutDept = assignments.filter(a => !a.departmentId);
    console.log(`Assignments without department: ${assignmentsWithoutDept.length}`);

    if (orphanedAssignments.length > 0) {
      console.log('\nSample orphaned assignments:');
      orphanedAssignments.slice(0, 5).forEach(a => {
        console.log(`- Assignment ID: ${a._id}, Subject ID: ${a.subjectId}`);
      });
    }

  } catch (error) {
    console.error('Error diagnosing database:', error);
  } finally {
    await client.close();
  }
}

diagnoseDatabase().catch(console.error);