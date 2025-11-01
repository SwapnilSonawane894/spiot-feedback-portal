const { MongoClient, ObjectId } = require('mongodb');

async function addOriginalSubjectsWithExistingDepts() {
  try {
    const client = await MongoClient.connect(process.env.MONGODB_URI);
    const db = client.db('feedbackPortal');

    // Clear existing data
    await db.collection('subjects').deleteMany({});
    await db.collection('departmentSubjects').deleteMany({});
    console.log('Cleared existing data');

    // Get existing academic year
    const academicYear = await db.collection('academicYears').findOne({ name: '2025-26' });
    if (!academicYear) {
      throw new Error('Academic year 2025-26 not found');
    }
    console.log('Found academic year:', academicYear.name);

    // Get existing departments
    const departments = await db.collection('departments').find({}).toArray();
    const departmentIds = {};
    for (const dept of departments) {
      departmentIds[dept.abbreviation] = dept._id;
      console.log(`Found department: ${dept.name} (${dept.abbreviation})`);
    }

    // Define all subjects by department (same structure as before)
    const subjectsByDept = {
      CO: {
        FY: [
          { name: 'Basic Mathematics', subjectCode: '311302', semester: 1 },
          { name: 'Communication Skills (English)', subjectCode: '311303', semester: 1 },
          { name: 'Basic Science (Physics, Chemistry)', subjectCode: '311305', semester: 1 },
          { name: 'Fundamentals Of ICT', subjectCode: '311001', semester: 1 },
          { name: 'Engineering Workshop Practice (Computer Group)', subjectCode: '311002', semester: 1 },
          { name: 'Yoga And Meditation', subjectCode: '311003', semester: 1 },
          { name: 'Engineering Graphics', subjectCode: '311008', semester: 1 }
        ],
        SY: [
          { name: 'Data Structure Using C', subjectCode: '313301', semester: 3 },
          { name: 'Database Management System', subjectCode: '313302', semester: 3 },
          { name: 'Digital Techniques', subjectCode: '313303', semester: 3 },
          { name: 'Object Oriented Programming Using C++', subjectCode: '313304', semester: 3 },
          { name: 'Computer Graphics', subjectCode: '313001', semester: 3 },
          { name: 'Essence Of Indian Constitution', subjectCode: '313002', semester: 3 }
        ],
        TY: [
          { name: 'Operating System', subjectCode: '315319', semester: 5 },
          { name: 'Software Engineering', subjectCode: '315323', semester: 5 },
          { name: 'Entrepreneurship Development And Startups', subjectCode: '315002', semester: 5 },
          { name: 'Seminar And Project Initiation Course', subjectCode: '315003', semester: 5 },
          { name: 'Advance Computer Network', subjectCode: '315321', semester: 5 }
        ]
      },
      EE: {
        SY: [
          { name: 'Electrical Circuits And Network', subjectCode: '313332', semester: 3 },
          { name: 'Electrical Power Generation,Transmission And Distribution', subjectCode: '313333', semester: 3 },
          { name: 'Electrical And Electronic Measurement', subjectCode: '313334', semester: 3 },
          { name: 'Fundamentals Of Power Electronics', subjectCode: '313335', semester: 3 },
          { name: 'Essence Of Indian Constitution', subjectCode: '313002', semester: 3 },
          { name: 'Electrical Material And Wiring Practice', subjectCode: '313015', semester: 3 }
        ],
        TY: [
          { name: 'A.C. Machines Performance', subjectCode: '315333', semester: 5 },
          { name: 'Switchgear And Protection', subjectCode: '315334', semester: 5 },
          { name: 'Entrepreneurship Development And Startups', subjectCode: '315002', semester: 5 },
          { name: 'Seminar And Project Initiation Course', subjectCode: '315003', semester: 5 },
          { name: 'Electric Vehicle Technology', subjectCode: '315335', semester: 5 }
        ]
      },
      CE: {
        SY: [
          { name: 'Strength Of Materials', subjectCode: '313308', semester: 3 },
          { name: 'Advanced Surveying', subjectCode: '313321', semester: 3 },
          { name: 'Concrete Technology', subjectCode: '313322', semester: 3 },
          { name: 'Highway Engineering', subjectCode: '313323', semester: 3 },
          { name: 'Essence Of Indian Constitution', subjectCode: '313002', semester: 3 },
          { name: 'Building Planning & Drawing With CAD', subjectCode: '313009', semester: 3 },
          { name: 'Construction Management', subjectCode: '313010', semester: 3 }
        ],
        TY: [
          { name: 'Theory Of Structure', subjectCode: '315313', semester: 5 },
          { name: 'Water Resource Engineering', subjectCode: '315314', semester: 5 },
          { name: 'Emerging Trends In Civil Engineering', subjectCode: '315315', semester: 5 },
          { name: 'Road Traffic Engineering', subjectCode: '315318', semester: 5 },
          { name: 'Entrepreneurship Development And Startups', subjectCode: '315002', semester: 5 },
          { name: 'Seminar And Project Initiation Course', subjectCode: '315003', semester: 5 }
        ]
      },
      ME: {
        SY: [
          { name: 'Strength of Material', subjectCode: '313308', semester: 3 },
          { name: 'Fluid Mechanics and Machinary', subjectCode: '313309', semester: 3 },
          { name: 'Thermal Engineering', subjectCode: '313310', semester: 3 },
          { name: 'Production Drawing', subjectCode: '313311', semester: 3 },
          { name: 'Basic Electrical and Electronics', subjectCode: '312020', semester: 3 },
          { name: 'Essence of Indian Constitution', subjectCode: '313002', semester: 3 },
          { name: 'Computer Aided Drafting', subjectCode: '313006', semester: 3 },
          { name: 'Fundamentals of Python Programming', subjectCode: '313007', semester: 3 }
        ],
        TY: [
          { name: 'Emerging Trends in Mechanical Engineering', subjectCode: '315363', semester: 5 },
          { name: 'Power Engineering', subjectCode: '315371', semester: 5 },
          { name: 'Automobile Engineering', subjectCode: '315372', semester: 5 },
          { name: 'Seminar and Project initiation Course', subjectCode: '315003', semester: 5 },
          { name: 'Power Plant Engineering', subjectCode: '315374', semester: 5 }
        ]
      }
    };

    // Add subjects for each department
    for (const [deptCode, yearSubjects] of Object.entries(subjectsByDept)) {
      const deptId = departmentIds[deptCode];
      if (!deptId) {
        console.log(`Warning: Department ${deptCode} not found`);
        continue;
      }
      
      console.log(`\nAdding subjects for ${deptCode}:`);
      
      for (const [year, subjects] of Object.entries(yearSubjects)) {
        for (const subject of subjects) {
          // Create subject
          const subjectDoc = {
            ...subject,
            academicYearId: academicYear._id,
            departmentId: deptId,
            createdAt: new Date(),
            updatedAt: new Date()
          };

          const result = await db.collection('subjects').insertOne(subjectDoc);
          console.log(`Added ${year} subject: ${subject.name}`);

          // Create department-subject mapping
          await db.collection('departmentSubjects').insertOne({
            departmentId: deptId,
            subjectId: result.insertedId,
            academicYearId: academicYear._id,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }
      }
    }

    // Final verification
    const subjectsCount = await db.collection('subjects').countDocuments();
    const mappingsCount = await db.collection('departmentSubjects').countDocuments();
    console.log('\nVerification:');
    console.log(`Total subjects added: ${subjectsCount}`);
    console.log(`Total department-subject mappings created: ${mappingsCount}`);

    await client.close();
    console.log('\nData population completed successfully!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

addOriginalSubjectsWithExistingDepts();