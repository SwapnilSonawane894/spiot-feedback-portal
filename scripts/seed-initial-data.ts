import { getDatabase } from '../src/lib/mongodb';
import bcrypt from 'bcrypt';

const COLLECTIONS = {
  USERS: 'users',
  DEPARTMENTS: 'departments',
  STAFF: 'staff',
};

async function seedData() {
  console.log('🌱 Starting database seeding...\n');

  try {
    const db = await getDatabase();

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await db.collection(COLLECTIONS.STAFF).deleteMany({});
    await db.collection(COLLECTIONS.USERS).deleteMany({});
    await db.collection(COLLECTIONS.DEPARTMENTS).deleteMany({});
    console.log('✅ Existing data cleared\n');

    // 1. Create Departments
    console.log('🏢 Creating departments...');
    const departments = [
      { name: 'Computer Engineering', abbreviation: 'CO' },
      { name: 'Electronics Engineering', abbreviation: 'EE' },
      { name: 'Civil Engineering', abbreviation: 'CE' },
      { name: 'Mechanical Engineering', abbreviation: 'ME' },
      { name: 'General/Non-Academic', abbreviation: 'NA' },
    ];

    const departmentMap: Record<string, string> = {};
    for (const dept of departments) {
      const result = await db.collection(COLLECTIONS.DEPARTMENTS).insertOne({
        ...dept,
        isFeedbackActive: false,
        createdAt: new Date(),
      });
      departmentMap[dept.abbreviation] = result.insertedId.toString();
      console.log(`  ✅ ${dept.name} (${dept.abbreviation})`);
    }
    console.log('');

    // 2. Create Admin User
    console.log('👤 Creating admin user...');
    const adminPassword = await bcrypt.hash('123', 10);
    const adminResult = await db.collection(COLLECTIONS.USERS).insertOne({
      email: 'admin@gmail.com',
      name: 'Administrator',
      role: 'ADMIN',
      hashedPassword: adminPassword,
      createdAt: new Date(),
    });
    console.log('  ✅ Admin user created (email: admin@gmail.com, password: 123)\n');

    // 3. Create Staff Members
    console.log('👥 Creating staff members...');
    
    const staffData = [
      { name: 'Mrs. Bhosale S. S.', email: 'bhosale@gmail.com', password: 'bhosale', dept: 'CO' },
      { name: 'Mrs. Raut D. A', email: 'raut@gmail.com', password: 'raut', dept: 'EE' },
      { name: 'MS. Rajwade V. V', email: 'rajwade@gmail.com', password: 'rajwade', dept: 'CO' },
      { name: 'Ms. Wagh S. S.', email: 'wagh@gmail.com', password: 'wagh', dept: 'CO' },
      { name: 'Mr. Kadam R. C.', email: 'kadam@gmail.com', password: 'kadam', dept: 'CO' },
      { name: 'Ms. Kamble P. D.', email: 'kamble@gmail.com', password: 'Kamble', dept: 'CO' },
      { name: 'Mr. Jagtap R. G.', email: 'jagtap@gmail.com', password: 'jagtap', dept: 'NA' },
      { name: 'Ms. Dhapte S. N.', email: 'dhapte@gmail.com', password: 'dhapte', dept: 'NA' },
      { name: 'Mrs. Bankar P. S.', email: 'bankar@gmail.com', password: 'bankar', dept: 'NA' },
      { name: 'Mr. Hajare S. K.', email: 'hajare@gmail.com', password: 'hajare', dept: 'CE' },
      { name: 'Mr. Khatake R. B.', email: 'khatake@gmail.com', password: 'khatake', dept: 'NA' },
      { name: 'Ms. Shinde P.J.', email: 'shinde@gmail.com', password: 'shinde', dept: 'NA' },
      { name: 'Mr. Gharjare V. N.', email: 'gharjare@gmail.com', password: 'gharjare', dept: 'NA' },
      { name: 'Ms. Bhoite D. C.', email: 'bhoite@gmail.com', password: 'bhoite', dept: 'NA' },
      { name: 'Mr. Pawar A. N.', email: 'pawar@gmail.com', password: 'pawar', dept: 'ME' },
      { name: 'Mr. Bhoite M. A.', email: 'bhoite2@gmail.com', password: 'bhoite2', dept: 'ME' },
      { name: 'Mrs. Nagawade M. S.', email: 'nagawade@gmail.com', password: 'nagawade', dept: 'NA' },
      { name: 'Mr. Wagh S.T.', email: 'wagh2@gmail.com', password: 'wagh2', dept: 'NA' },
    ];

    for (const staff of staffData) {
      try {
        // Create user account for staff
        const hashedPassword = await bcrypt.hash(staff.password, 10);
        const userResult = await db.collection(COLLECTIONS.USERS).insertOne({
          email: staff.email,
          name: staff.name,
          role: 'STAFF',
          hashedPassword: hashedPassword,
          createdAt: new Date(),
        });

        // Create staff profile
        await db.collection(COLLECTIONS.STAFF).insertOne({
          userId: userResult.insertedId.toString(),
          departmentId: departmentMap[staff.dept],
          createdAt: new Date(),
        });

        console.log(`  ✅ ${staff.name} (${staff.dept})`);
      } catch (error) {
        console.log(`  ❌ Failed to create ${staff.name}: ${error}`);
      }
    }

    console.log('\n✅ Database seeding completed successfully!\n');
    console.log('📋 Login Credentials:');
    console.log('   Admin:');
    console.log('     Email:    admin@gmail.com');
    console.log('     Password: 123\n');
    console.log('   Sample Staff:');
    console.log('     Email:    bhosale@gmail.com');
    console.log('     Password: bhosale\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seedData();
