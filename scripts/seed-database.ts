import bcrypt from 'bcrypt';
import { 
  userService, 
  departmentService, 
  staffService, 
  academicYearService,
  subjectService,
  COLLECTIONS 
} from '../src/lib/firebase-services';
import { firestore } from '../src/lib/firebase';

async function seedDatabase() {
  console.log('🌱 Seeding Firebase database with complete structure...\n');

  try {
    // ========== 1. CREATE ACADEMIC YEARS ==========
    console.log('📚 Creating Academic Years...');
    const academicYears = [
      { name: 'First Year', order: 1 },
      { name: 'Second Year', order: 2 },
      { name: 'Third Year', order: 3 },
      { name: 'Fourth Year', order: 4 },
    ];

    const createdAcademicYears: any[] = [];
    for (const yearData of academicYears) {
      // Check if year exists by querying all and filtering
      const allYears = await academicYearService.findMany();
      let year = allYears.find((y: any) => y.name === yearData.name);
      
      if (!year) {
        year = await academicYearService.create(yearData);
        console.log(`   ✅ Created: ${year.name}`);
      } else {
        console.log(`   ⏭️  Already exists: ${year.name}`);
      }
      createdAcademicYears.push(year);
    }

    // ========== 2. CREATE DEPARTMENTS ==========
    console.log('\n🏛️  Creating Departments...');
    const departments = [
      { name: 'Computer Engineering', abbreviation: 'CO', isFeedbackActive: true, reportsReleased: false },
      { name: 'Information Technology', abbreviation: 'IT', isFeedbackActive: true, reportsReleased: false },
      { name: 'Electronics Engineering', abbreviation: 'EL', isFeedbackActive: true, reportsReleased: false },
      { name: 'Mechanical Engineering', abbreviation: 'ME', isFeedbackActive: true, reportsReleased: false },
    ];

    const createdDepartments: any[] = [];
    for (const deptData of departments) {
      let dept = await departmentService.findUnique({ abbreviation: deptData.abbreviation });
      if (!dept) {
        dept = await departmentService.create(deptData);
        console.log(`   ✅ Created: ${dept.name} (${dept.abbreviation})`);
      } else {
        console.log(`   ⏭️  Already exists: ${dept.name} (${dept.abbreviation})`);
      }
      createdDepartments.push(dept);
    }

    // ========== 3. CREATE ADMIN USER ==========
    console.log('\n👤 Creating Admin User...');
    let adminUser = await userService.findUnique({ email: 'admin@gmail.com' });
    if (!adminUser) {
      const hashedPassword = await bcrypt.hash('123', 10);
      adminUser = await userService.create({
        email: 'admin@gmail.com',
        name: 'Administrator',
        role: 'ADMIN',
        hashedPassword,
      });
      console.log('   ✅ Admin created: admin@gmail.com');
    } else {
      console.log('   ⏭️  Admin already exists: admin@gmail.com');
    }

    // ========== 4. CREATE HOD USERS (one per department) ==========
    console.log('\n👔 Creating HOD Users...');
    const hodUsers: any[] = [];
    for (let i = 0; i < createdDepartments.length; i++) {
      const dept = createdDepartments[i];
      const email = `hod.${dept.abbreviation.toLowerCase()}@spiot.edu`;
      
      let hodUser = await userService.findUnique({ email });
      if (!hodUser) {
        const hashedPassword = await bcrypt.hash('hod123', 10);
        hodUser = await userService.create({
          email,
          name: `HOD ${dept.name}`,
          role: 'HOD',
          hashedPassword,
          departmentId: dept.id,
        });
        console.log(`   ✅ Created HOD: ${email}`);

        // Create staff record for HOD
        const staffSnapshot = await firestore
          .collection(COLLECTIONS.STAFF)
          .where('userId', '==', hodUser.id)
          .limit(1)
          .get();
        
        if (staffSnapshot.empty) {
          await firestore.collection(COLLECTIONS.STAFF).add({
            userId: hodUser.id,
            departmentId: dept.id,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          console.log(`      📎 Staff record created`);
        }
      } else {
        console.log(`   ⏭️  HOD already exists: ${email}`);
      }
      hodUsers.push(hodUser);
    }

    // ========== 5. CREATE STAFF USERS ==========
    console.log('\n👨‍🏫 Creating Staff Users...');
    const staffCount = 3; // 3 staff per department
    for (const dept of createdDepartments) {
      for (let i = 1; i <= staffCount; i++) {
        const email = `staff${i}.${dept.abbreviation.toLowerCase()}@spiot.edu`;
        
        let staffUser = await userService.findUnique({ email });
        if (!staffUser) {
          const hashedPassword = await bcrypt.hash('staff123', 10);
          staffUser = await userService.create({
            email,
            name: `${dept.abbreviation} Staff ${i}`,
            role: 'STAFF',
            hashedPassword,
            departmentId: dept.id,
          });
          console.log(`   ✅ Created Staff: ${email}`);

          // Create staff record
          const staffSnapshot = await firestore
            .collection(COLLECTIONS.STAFF)
            .where('userId', '==', staffUser.id)
            .limit(1)
            .get();
          
          if (staffSnapshot.empty) {
            await firestore.collection(COLLECTIONS.STAFF).add({
              userId: staffUser.id,
              departmentId: dept.id,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        } else {
          console.log(`   ⏭️  Staff already exists: ${email}`);
        }
      }
    }

    // ========== 6. CREATE STUDENT USERS ==========
    console.log('\n🎓 Creating Student Users...');
    let enrollmentNumber = 2024001;
    for (const dept of createdDepartments) {
      for (const year of createdAcademicYears) {
        // Create 2 students per department per year
        for (let i = 0; i < 2; i++) {
          const enrollment = enrollmentNumber.toString();
          
          let studentUser = await userService.findUnique({ email: enrollment });
          if (!studentUser) {
            const hashedPassword = await bcrypt.hash(enrollment, 10);
            studentUser = await userService.create({
              email: enrollment,
              name: `Student ${enrollment}`,
              role: 'STUDENT',
              hashedPassword,
              departmentId: dept.id,
              academicYearId: year.id,
            });
            console.log(`   ✅ Created Student: ${enrollment} (${dept.abbreviation} - ${year.name})`);
          } else {
            console.log(`   ⏭️  Student already exists: ${enrollment}`);
          }
          enrollmentNumber++;
        }
      }
    }

    // ========== 7. CREATE SUBJECTS ==========
    console.log('\n📖 Creating Subjects...');
    const subjectsData = [
      // First Year subjects
      { name: 'Engineering Mathematics I', code: 'FE-MATH1', yearName: 'First Year' },
      { name: 'Engineering Physics', code: 'FE-PHYS', yearName: 'First Year' },
      { name: 'Engineering Chemistry', code: 'FE-CHEM', yearName: 'First Year' },
      { name: 'Basic Electrical Engineering', code: 'FE-BEE', yearName: 'First Year' },
      
      // Second Year subjects
      { name: 'Data Structures', code: 'SE-DS', yearName: 'Second Year' },
      { name: 'Object Oriented Programming', code: 'SE-OOP', yearName: 'Second Year' },
      { name: 'Database Management Systems', code: 'SE-DBMS', yearName: 'Second Year' },
      { name: 'Computer Networks', code: 'SE-CN', yearName: 'Second Year' },
      
      // Third Year subjects
      { name: 'Operating Systems', code: 'TE-OS', yearName: 'Third Year' },
      { name: 'Software Engineering', code: 'TE-SE', yearName: 'Third Year' },
      { name: 'Web Technologies', code: 'TE-WT', yearName: 'Third Year' },
      { name: 'Machine Learning', code: 'TE-ML', yearName: 'Third Year' },
      
      // Fourth Year subjects
      { name: 'Cloud Computing', code: 'BE-CC', yearName: 'Fourth Year' },
      { name: 'Artificial Intelligence', code: 'BE-AI', yearName: 'Fourth Year' },
      { name: 'Cyber Security', code: 'BE-CS', yearName: 'Fourth Year' },
      { name: 'Project Work', code: 'BE-PROJ', yearName: 'Fourth Year' },
    ];

    for (const subjectData of subjectsData) {
      const year = createdAcademicYears.find(y => y.name === subjectData.yearName);
      if (!year) continue;

      let subject = await subjectService.findUnique({ subjectCode: subjectData.code });
      if (!subject) {
        subject = await subjectService.create({
          name: subjectData.name,
          subjectCode: subjectData.code,
          academicYearId: year.id,
        });
        console.log(`   ✅ Created: ${subject.name} (${subject.subjectCode})`);
      } else {
        console.log(`   ⏭️  Already exists: ${subject.name}`);
      }
    }

    // ========== SUMMARY ==========
    console.log('\n' + '='.repeat(60));
    console.log('✨ Database seeded successfully!');
    console.log('='.repeat(60));
    console.log('\n📋 Login Credentials:\n');
    console.log('ADMIN:');
    console.log('  Email: admin@gmail.com');
    console.log('  Password: 123\n');
    console.log('HODs (one per department):');
    for (const dept of createdDepartments) {
      console.log(`  ${dept.abbreviation}: hod.${dept.abbreviation.toLowerCase()}@spiot.edu / hod123`);
    }
    console.log('\nSTAFF:');
    console.log('  Pattern: staff1.co@spiot.edu, staff2.co@spiot.edu, etc.');
    console.log('  Password: staff123\n');
    console.log('STUDENTS:');
    console.log('  Pattern: 2024001, 2024002, 2024003, etc.');
    console.log('  Password: (same as enrollment number)\n');
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

seedDatabase()
  .then(() => {
    console.log('✅ Seed completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  });
