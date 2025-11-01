#!/usr/bin/env node
const { MongoClient, ObjectId } = require('mongodb');

async function fixAssignmentIssues() {
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

    // 1. Fix students with 0 assignments
    console.log('\nFixing students with 0 assignments...');
    const studentsWithZero = await db.collection('users').find({
      role: 'STUDENT',
      departmentId: { $exists: true },
      academicYearId: { $exists: true }
    }).toArray();

    for (const student of studentsWithZero) {
      // Get correct department-subject links for student's year
      const deptSubjects = await db.collection('departmentSubjects').find({
        departmentId: student.departmentId,
        academicYearId: student.academicYearId
      }).toArray();

      if (deptSubjects.length === 0) {
        console.log(`No subjects found for student ${student.email} - adding default subjects`);
        // Find any subjects for this department to link them
        const subjects = await db.collection('subjects').find({
          departmentId: student.departmentId
        }).toArray();

        for (const subject of subjects) {
          await db.collection('departmentSubjects').updateOne(
            {
              departmentId: student.departmentId,
              subjectId: subject._id.toString(),
              academicYearId: student.academicYearId
            },
            {
              $setOnInsert: {
                departmentId: student.departmentId,
                subjectId: subject._id.toString(),
                academicYearId: student.academicYearId,
                createdAt: new Date()
              }
            },
            { upsert: true }
          );
        }
      }
    }

    // 2. Fix students with too many assignments (14)
    console.log('\nFixing students with excess assignments...');
    const assignmentsPerStudent = await db.collection('facultyAssignments').aggregate([
      {
        $group: {
          _id: {
            departmentId: "$departmentId",
            academicYearId: "$academicYearId"
          },
          count: { $sum: 1 }
        }
      },
      {
        $match: {
          count: { $gt: 8 } // Most students should have 5-7 assignments
        }
      }
    ]).toArray();

    for (const group of assignmentsPerStudent) {
      console.log(`Found ${group.count} assignments for dept=${group._id.departmentId}, year=${group._id.academicYearId}`);

      // Get correct subject list for this department and year
      const validSubjects = await db.collection('departmentSubjects').find({
        departmentId: group._id.departmentId,
        academicYearId: group._id.academicYearId
      }).toArray();

      const validSubjectIds = validSubjects.map(vs => vs.subjectId);

      // Remove assignments that don't match valid subjects
      const invalidAssignments = await db.collection('facultyAssignments').find({
        departmentId: group._id.departmentId,
        academicYearId: group._id.academicYearId,
        subjectId: { $nin: validSubjectIds }
      }).toArray();

      if (invalidAssignments.length > 0) {
        console.log(`Removing ${invalidAssignments.length} invalid assignments`);
        await db.collection('facultyAssignments').deleteMany({
          _id: { $in: invalidAssignments.map(a => a._id) }
        });
      }
    }

    // 3. Verify fixes
    console.log('\nVerifying fixes...');
    const students = await db.collection('users').find({ role: 'STUDENT' }).toArray();
    const assignmentCounts = {};

    for (const student of students) {
      const assignments = await db.collection('facultyAssignments').find({
        departmentId: student.departmentId,
        academicYearId: student.academicYearId
      }).toArray();

      const count = assignments.length;
      assignmentCounts[count] = (assignmentCounts[count] || 0) + 1;
    }

    console.log('\nFinal assignment distribution:');
    Object.entries(assignmentCounts).sort(([a], [b]) => Number(a) - Number(b)).forEach(([count, students]) => {
      console.log(`${count} assignments: ${students} students`);
    });

  } catch (error) {
    console.error('Error fixing assignments:', error);
  } finally {
    await client.close();
  }
}

fixAssignmentIssues().catch(console.error);