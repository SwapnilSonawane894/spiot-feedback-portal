const { MongoClient } = require('mongodb');

async function addSampleData() {
  try {
    const client = await MongoClient.connect(process.env.MONGODB_URI);
    const db = client.db();

    // First, let's create sample academic year if not exists
    const academicYear = {
      _id: '68f63976dc335227e2601fe0',
      name: '2023-24',
      abbreviation: '23-24',
      year: 2023,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await db.collection('academicYears').updateOne(
      { _id: academicYear._id },
      { $set: academicYear },
      { upsert: true }
    );
    console.log('Added/Updated academic year');

    // Create departments if not exist
    const departments = [
      {
        _id: '68f6390b641c7bcb2781b39c',
        name: 'Computer Engineering',
        abbreviation: 'CO',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: '68f6390b641c7bcb2781b39d',
        name: 'Electronics Engineering',
        abbreviation: 'EE',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: '68f6390b641c7bcb2781b39e',
        name: 'Mechanical Engineering',
        abbreviation: 'ME',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    for (const dept of departments) {
      await db.collection('departments').updateOne(
        { _id: dept._id },
        { $set: dept },
        { upsert: true }
      );
    }
    console.log('Added/Updated departments');

    // Sample subjects for Computer Engineering
    const coSubjects = [
      { name: 'Basic Mathematics', subjectCode: '311302', semester: 1 },
      { name: 'Programming in C', subjectCode: '311303', semester: 1 },
      { name: 'Database Management Systems', subjectCode: '311304', semester: 3 },
      { name: 'Operating Systems', subjectCode: '311305', semester: 4 }
    ];

    // Sample subjects for Electronics Engineering
    const eeSubjects = [
      { name: 'Basic Electronics', subjectCode: '321302', semester: 1 },
      { name: 'Digital Circuits', subjectCode: '321303', semester: 2 },
      { name: 'Microprocessors', subjectCode: '321304', semester: 3 }
    ];

    // Sample subjects for Mechanical Engineering
    const meSubjects = [
      { name: 'Engineering Mechanics', subjectCode: '331302', semester: 1 },
      { name: 'Thermodynamics', subjectCode: '331303', semester: 2 },
      { name: 'Machine Design', subjectCode: '331304', semester: 3 }
    ];

    // Function to add subjects for a department
    async function addSubjectsForDepartment(subjects, departmentId) {
      for (const subject of subjects) {
        // Create subject
        const subjectDoc = {
          ...subject,
          academicYearId: academicYear._id,
          departmentId: departmentId,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const result = await db.collection('subjects').insertOne(subjectDoc);
        console.log(`Added subject: ${subject.name}`);

        // Create department-subject mapping
        await db.collection('departmentSubjects').insertOne({
          departmentId: departmentId,
          subjectId: result.insertedId,
          academicYearId: academicYear._id,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        console.log(`Created mapping for: ${subject.name}`);
      }
    }

    // Add subjects for each department
    await addSubjectsForDepartment(coSubjects, departments[0]._id);
    await addSubjectsForDepartment(eeSubjects, departments[1]._id);
    await addSubjectsForDepartment(meSubjects, departments[2]._id);

    console.log('\nVerifying data:');
    const subjectsCount = await db.collection('subjects').countDocuments();
    const mappingsCount = await db.collection('departmentSubjects').countDocuments();
    console.log(`Total subjects: ${subjectsCount}`);
    console.log(`Total department-subject mappings: ${mappingsCount}`);

    await client.close();
    console.log('\nData population completed successfully!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

addSampleData();