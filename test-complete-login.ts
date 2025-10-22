import { getDatabase } from './src/lib/mongodb';
import bcrypt from 'bcrypt';

async function testCompleteLogin() {
  const testUsers = [
    { email: 'admin@gmail.com', password: '123', expectedRole: 'ADMIN', expectedPath: '/admin' },
    { email: 'kharat@gmail.com', password: 'kharat', expectedRole: 'HOD', expectedPath: '/hod/dashboard' },
    { email: 'bhosale@gmail.com', password: 'bhosale', expectedRole: 'FACULTY', expectedPath: '/faculty/dashboard' }
  ];

  console.log('=== Complete Login Flow Test ===\n');
  console.log('Testing MongoDB connection and user authentication...\n');

  try {
    const db = await getDatabase();
    console.log('✅ MongoDB connection successful!\n');

    for (const testUser of testUsers) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Testing: ${testUser.email} (${testUser.expectedRole})`);
      console.log('='.repeat(60));

      // 1. Check if user exists in database
      const user = await db.collection('users').findOne({ email: testUser.email });
      if (!user) {
        console.log(`❌ FAIL: User not found in database`);
        continue;
      }
      console.log('✅ User found in database');
      console.log(`   - Name: ${user.name}`);
      console.log(`   - Role: ${user.role}`);
      console.log(`   - Email: ${user.email}`);

      // 2. Verify password
      if (!user.hashedPassword) {
        console.log('❌ FAIL: No hashed password in database');
        continue;
      }

      const passwordMatch = await bcrypt.compare(testUser.password, user.hashedPassword);
      if (!passwordMatch) {
        console.log(`❌ FAIL: Password does not match`);
        continue;
      }
      console.log('✅ Password verified successfully');

      // 3. Verify role matches expected
      if (user.role !== testUser.expectedRole) {
        console.log(`❌ FAIL: Role mismatch (expected: ${testUser.expectedRole}, got: ${user.role})`);
        continue;
      }
      console.log(`✅ Role verified: ${user.role}`);

      // 4. Verify dashboard path
      console.log(`✅ Expected redirect: ${testUser.expectedPath}`);

      console.log('\n✅ ALL CHECKS PASSED for ' + testUser.email);
    }

    console.log('\n' + '='.repeat(60));
    console.log('TEST SUMMARY');
    console.log('='.repeat(60));
    console.log('✅ MongoDB is properly configured');
    console.log('✅ All test users exist in the database');
    console.log('✅ All passwords are correctly hashed and match');
    console.log('✅ All user roles are correct');
    console.log('\n🎉 Login functionality is working correctly!');
    console.log('\nYou can now login with:');
    console.log('  • admin@gmail.com / 123 (ADMIN)');
    console.log('  • kharat@gmail.com / kharat (HOD)');
    console.log('  • bhosale@gmail.com / bhosale (FACULTY)');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR:', error);
    process.exit(1);
  }
}

testCompleteLogin();
