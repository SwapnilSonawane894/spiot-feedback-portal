import bcrypt from 'bcrypt';
import { firestore } from '../src/lib/firebase';
import { userService, departmentService, staffService, academicYearService, COLLECTIONS } from '../src/lib/firebase-services';

async function seedTestUsers() {
  console.log('🌱 Seeding test users...\n');

  try {
    // Create a test department if it doesn't exist
    let department = await departmentService.findFirst({ abbreviation: 'CS' });
    if (!department) {
      console.log('Creating Computer Science department...');
      department = await departmentService.create({
        name: 'Computer Science',
        abbreviation: 'CS',
        isFeedbackActive: true,
        reportsReleased: false,
      });
      console.log('✅ Department created:', department.name);
    }

    // Create academic year if it doesn't exist
    let academicYear = await academicYearService.findFirst({ name: 'First Year' });
    if (!academicYear) {
      console.log('Creating First Year academic year...');
      academicYear = await academicYearService.create({
        name: 'First Year',
        order: 1,
      });
      console.log('✅ Academic Year created:', academicYear.name);
    }

    const testUsers = [
      {
        role: 'ADMIN',
        email: 'admin@test.com',
        password: 'admin123',
        name: 'Admin User',
      },
      {
        role: 'HOD',
        email: 'hod@test.com',
        password: 'hod123',
        name: 'HOD User',
        departmentId: department.id,
      },
      {
        role: 'STAFF',
        email: 'staff@test.com',
        password: 'staff123',
        name: 'Staff User',
        departmentId: department.id,
      },
      {
        role: 'STUDENT',
        email: '2024001',
        password: '2024001',
        name: 'Student User',
        departmentId: department.id,
        academicYearId: academicYear.id,
      },
    ];

    console.log('\n📝 Creating users...\n');

    for (const userData of testUsers) {
      // Check if user already exists
      const existingUser = await userService.findUnique({ email: userData.email });
      
      if (existingUser) {
        console.log(`⏭️  ${userData.role} user already exists: ${userData.email}`);
        continue;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      // Create user
      const user = await userService.create({
        email: userData.email,
        name: userData.name,
        role: userData.role,
        hashedPassword,
        ...(userData.departmentId && { departmentId: userData.departmentId }),
        ...(userData.academicYearId && { academicYearId: userData.academicYearId }),
      });

      console.log(`✅ Created ${userData.role}: ${userData.email} (password: ${userData.password})`);

      // Create staff record for HOD and STAFF
      if (userData.role === 'HOD' || userData.role === 'STAFF') {
        const existingStaff = await staffService.findFirst({ where: { userId: user.id } });
        if (!existingStaff) {
          await firestore.collection(COLLECTIONS.STAFF).add({
            userId: user.id,
            departmentId: userData.departmentId,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          console.log(`   📎 Staff record created for ${userData.name}`);
        }
      }
    }

    console.log('\n✨ Test users seeded successfully!\n');
    console.log('📋 Login Credentials:');
    console.log('   Admin:   admin@test.com / admin123');
    console.log('   HOD:     hod@test.com / hod123');
    console.log('   Staff:   staff@test.com / staff123');
    console.log('   Student: 2024001 / 2024001\n');

  } catch (error) {
    console.error('❌ Error seeding users:', error);
    throw error;
  }
}

seedTestUsers()
  .then(() => {
    console.log('✅ Seed completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  });
