import bcrypt from 'bcrypt';
import { userService } from '../src/lib/firebase-services';

async function testAuthentication() {
  console.log('🔐 Testing Authentication System\n');
  console.log('=' .repeat(50));
  console.log('\n');

  try {
    // Step 1: Verify admin user exists
    console.log('1️⃣  Checking if admin user exists...');
    const user = await userService.findUnique({ email: 'admin@gmail.com' });
    
    if (!user) {
      console.error('   ❌ Admin user not found!');
      return false;
    }
    
    console.log('   ✅ Admin user found');
    console.log(`      - ID: ${user.id}`);
    console.log(`      - Email: ${user.email}`);
    console.log(`      - Name: ${user.name}`);
    console.log(`      - Role: ${user.role}\n`);

    // Step 2: Test password verification
    console.log('2️⃣  Testing password verification...');
    const isCorrectPassword = await bcrypt.compare('123', user.hashedPassword);
    
    if (!isCorrectPassword) {
      console.error('   ❌ Password verification failed!');
      return false;
    }
    
    console.log('   ✅ Password verified successfully\n');

    // Step 3: Test wrong password
    console.log('3️⃣  Testing wrong password rejection...');
    const isWrongPassword = await bcrypt.compare('wrong-password', user.hashedPassword);
    
    if (isWrongPassword) {
      console.error('   ❌ Wrong password was accepted!');
      return false;
    }
    
    console.log('   ✅ Wrong password correctly rejected\n');

    // Step 4: Verify required fields are present
    console.log('4️⃣  Verifying user data integrity...');
    const requiredFields = ['id', 'email', 'name', 'role', 'hashedPassword'];
    const missingFields = requiredFields.filter(field => !user[field]);
    
    if (missingFields.length > 0) {
      console.error(`   ❌ Missing required fields: ${missingFields.join(', ')}`);
      return false;
    }
    
    console.log('   ✅ All required fields present\n');

    // Step 5: Check that only one user exists
    console.log('5️⃣  Verifying database has only one user...');
    const userCount = await userService.count();
    
    if (userCount !== 1) {
      console.error(`   ❌ Expected 1 user, found ${userCount}`);
      return false;
    }
    
    console.log('   ✅ Database contains exactly 1 user\n');

    // Step 6: Verify role is ADMIN
    console.log('6️⃣  Verifying user has ADMIN role...');
    
    if (user.role !== 'ADMIN') {
      console.error(`   ❌ Expected ADMIN role, found ${user.role}`);
      return false;
    }
    
    console.log('   ✅ User has ADMIN role\n');

    console.log('=' .repeat(50));
    console.log('\n✅ All authentication tests passed!\n');
    console.log('🎉 You can now login at /login with:\n');
    console.log('   📧 Email:    admin@gmail.com');
    console.log('   🔑 Password: 123\n');
    
    return true;

  } catch (error) {
    console.error('\n❌ Authentication test failed:', error);
    return false;
  }
}

testAuthentication()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
