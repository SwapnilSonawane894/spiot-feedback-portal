import { getDatabase } from '../src/lib/mongodb';
import bcrypt from 'bcrypt';

async function checkStaffLogin() {
  try {
    const db = await getDatabase();
    
    // Check for bhosale user
    const email = 'bhosale@gmail.com';
    const password = 'bhosale';
    
    console.log('🔍 Searching for user:', email);
    const user = await db.collection('users').findOne({ email });
    
    if (!user) {
      console.log('❌ User NOT found in database!');
      return;
    }
    
    console.log('\n✅ User found:');
    console.log('   - ID:', user._id);
    console.log('   - Name:', user.name);
    console.log('   - Email:', user.email);
    console.log('   - Role:', user.role);
    console.log('   - Department:', user.departmentId);
    console.log('   - Password Hash:', user.password?.substring(0, 20) + '...');
    
    // Test password
    console.log('\n🔐 Testing password:', password);
    const isValid = await bcrypt.compare(password, user.password);
    console.log('   - Password valid:', isValid ? '✅ YES' : '❌ NO');
    
    if (!isValid) {
      console.log('\n⚠️ Password does not match!');
      console.log('   - Generating new hash for comparison...');
      const newHash = await bcrypt.hash(password, 10);
      console.log('   - New hash:', newHash.substring(0, 20) + '...');
      console.log('   - Stored hash:', user.password?.substring(0, 20) + '...');
    }
    
    // Check staff profile
    console.log('\n👤 Checking staff profile...');
    const staff = await db.collection('staff').findOne({ userId: user._id });
    if (staff) {
      console.log('   ✅ Staff profile exists');
      console.log('   - Staff ID:', staff._id);
      console.log('   - Department:', staff.departmentId);
    } else {
      console.log('   ❌ No staff profile found!');
    }
    
    // List all users
    console.log('\n📋 All users in database:');
    const allUsers = await db.collection('users').find({}).toArray();
    allUsers.forEach(u => {
      console.log(`   - ${u.email} (${u.role}) - ${u.name || 'No name'}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkStaffLogin();
