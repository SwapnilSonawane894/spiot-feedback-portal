import { getDatabase } from '../src/lib/mongodb';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcrypt';

const COLLECTIONS = {
  USERS: 'users',
  DEPARTMENTS: 'departments',
  STAFF: 'staff',
  ACADEMIC_YEARS: 'academicYears',
  SUBJECTS: 'subjects',
  FACULTY_ASSIGNMENTS: 'facultyAssignments',
  FEEDBACK: 'feedback',
  HOD_SUGGESTIONS: 'hodSuggestions',
};

async function seedDatabase() {
  try {
    console.log('🔌 Connecting to database...');
    const db = await getDatabase();
    
    console.log('🗑️  Clearing existing students and staff...');
    await db.collection(COLLECTIONS.USERS).deleteMany({ role: { $in: ['STUDENT', 'STAFF', 'FACULTY', 'HOD'] } });
    await db.collection(COLLECTIONS.STAFF).deleteMany({});
    await db.collection(COLLECTIONS.FACULTY_ASSIGNMENTS).deleteMany({});
    await db.collection(COLLECTIONS.FEEDBACK).deleteMany({});
    await db.collection(COLLECTIONS.HOD_SUGGESTIONS).deleteMany({});
    
    console.log('📚 Creating departments...');
    const departments = [
      { name: 'Computer Engineering', abbreviation: 'CO' },
      { name: 'Electrical Engineering', abbreviation: 'EE' },
      { name: 'Civil Engineering', abbreviation: 'CE' },
      { name: 'Mechanical Engineering', abbreviation: 'ME' },
      { name: 'Not Assigned', abbreviation: 'NA' },
    ];

    const departmentMap: Record<string, string> = {};
    
    for (const dept of departments) {
      const existing = await db.collection(COLLECTIONS.DEPARTMENTS).findOne({ abbreviation: dept.abbreviation });
      if (existing) {
        departmentMap[dept.abbreviation] = existing._id.toString();
        console.log(`   ✓ Department ${dept.abbreviation} already exists`);
      } else {
        const result = await db.collection(COLLECTIONS.DEPARTMENTS).insertOne({
          ...dept,
          isFeedbackActive: false,
          createdAt: new Date(),
        });
        departmentMap[dept.abbreviation] = result.insertedId.toString();
        console.log(`   ✓ Created department: ${dept.name} (${dept.abbreviation})`);
      }
    }

    console.log('👤 Creating admin user...');
    const adminEmail = 'admin@gmail.com';
    const existingAdmin = await db.collection(COLLECTIONS.USERS).findOne({ email: adminEmail });
    
    if (existingAdmin) {
      console.log('   ⚠️  Admin user already exists');
    } else {
      const hashedPassword = await bcrypt.hash('123', 10);
      await db.collection(COLLECTIONS.USERS).insertOne({
        email: adminEmail,
        name: 'Admin',
        role: 'ADMIN',
        hashedPassword,
        createdAt: new Date(),
      });
      console.log(`   ✓ Created admin user: ${adminEmail}`);
    }

    console.log('👥 Creating staff members...');
    const staffMembers = [
      { name: 'Mrs. Bhosale S. S.', email: 'bhosale@gmail.com', password: 'bhosale', department: 'CO' },
      { name: 'Mrs. Raut D. A', email: 'raut@gmail.com', password: 'raut', department: 'EE' },
      { name: 'MS. Rajwade V. V', email: 'rajwade@gmail.com', password: 'rajwade', department: 'CO' },
      { name: 'Ms. Wagh S. S.', email: 'wagh@gmail.com', password: 'wagh', department: 'CO' },
      { name: 'Mr. Kadam R. C.', email: 'kadam@gmail.com', password: 'kadam', department: 'CO' },
      { name: 'Ms. Kamble P. D.', email: 'kamble@gmail.com', password: 'Kamble', department: 'CO' },
      { name: 'Mr. Jagtap R. G.', email: 'jagtap@gmail.com', password: 'jagtap', department: 'NA' },
      { name: 'Ms. Dhapte S. N.', email: 'dhapte@gmail.com', password: 'dhapte', department: 'NA' },
      { name: 'Mrs. Bankar P. S.', email: 'bankar@gmail.com', password: 'bankar', department: 'NA' },
      { name: 'Mr. Hajare S. K.', email: 'hajare@gmail.com', password: 'hajare', department: 'CE' },
      { name: 'Mr. Khatake R. B.', email: 'khatake@gmail.com', password: 'khatake', department: 'NA' },
      { name: 'Ms. Shinde P.J.', email: 'shinde@gmail.com', password: 'shinde', department: 'NA' },
      { name: 'Mr. Gharjare V. N.', email: 'gharjare@gmail.com', password: 'gharjare', department: 'NA' },
      { name: 'Ms. Bhoite D. C.', email: 'bhoite@gmail.com', password: 'bhoite', department: 'NA' },
      { name: 'Mr. Pawar A. N.', email: 'pawar@gmail.com', password: 'pawar', department: 'ME' },
      { name: 'Mr. Bhoite M. A.', email: 'bhoite2@gmail.com', password: 'bhoite2', department: 'ME' },
      { name: 'Mrs. Nagawade M. S.', email: 'nagawade@gmail.com', password: 'nagawade', department: 'NA' },
      { name: 'Mr. Wagh S.T.', email: 'wagh2@gmail.com', password: 'wagh2', department: 'NA' },
    ];

    let staffCreated = 0;
    let staffSkipped = 0;

    for (const staff of staffMembers) {
      const existingUser = await db.collection(COLLECTIONS.USERS).findOne({ email: staff.email });
      
      if (existingUser) {
        console.log(`   ⚠️  Staff ${staff.email} already exists`);
        staffSkipped++;
        continue;
      }

      const hashedPassword = await bcrypt.hash(staff.password, 10);
      const departmentId = departmentMap[staff.department];

      const userResult = await db.collection(COLLECTIONS.USERS).insertOne({
        email: staff.email,
        name: staff.name,
        role: 'FACULTY',
        hashedPassword,
        departmentId,
        createdAt: new Date(),
      });

      await db.collection(COLLECTIONS.STAFF).insertOne({
        userId: userResult.insertedId.toString(),
        departmentId,
        createdAt: new Date(),
      });

      console.log(`   ✓ Created staff: ${staff.name} (${staff.department})`);
      staffCreated++;
    }

    console.log('\n✅ Seeding completed successfully!');
    console.log(`   📊 Summary:`);
    console.log(`      - Departments: ${Object.keys(departmentMap).length}`);
    console.log(`      - Admin users: 1`);
    console.log(`      - Staff created: ${staffCreated}`);
    console.log(`      - Staff skipped: ${staffSkipped}`);
    console.log(`      - Students cleared: ✓`);
    console.log(`      - Old staff cleared: ✓`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
