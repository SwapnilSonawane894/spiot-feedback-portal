import { getDatabase } from '../src/lib/mongodb';
import bcrypt from 'bcrypt';

async function fixStaffPasswords() {
  try {
    console.log('🔌 Connecting to database...');
    const db = await getDatabase();
    
    const staffMembers = [
      { email: 'bhosale@gmail.com', password: 'bhosale' },
      { email: 'raut@gmail.com', password: 'raut' },
      { email: 'rajwade@gmail.com', password: 'rajwade' },
      { email: 'wagh@gmail.com', password: 'wagh' },
      { email: 'kadam@gmail.com', password: 'kadam' },
      { email: 'kamble@gmail.com', password: 'Kamble' },
      { email: 'jagtap@gmail.com', password: 'jagtap' },
      { email: 'dhapte@gmail.com', password: 'dhapte' },
      { email: 'bankar@gmail.com', password: 'bankar' },
      { email: 'hajare@gmail.com', password: 'hajare' },
      { email: 'khatake@gmail.com', password: 'khatake' },
      { email: 'shinde@gmail.com', password: 'shinde' },
      { email: 'gharjare@gmail.com', password: 'gharjare' },
      { email: 'bhoite@gmail.com', password: 'bhoite' },
      { email: 'pawar@gmail.com', password: 'pawar' },
      { email: 'bhoite2@gmail.com', password: 'bhoite2' },
      { email: 'nagawade@gmail.com', password: 'nagawade' },
      { email: 'wagh2@gmail.com', password: 'wagh2' },
    ];
    
    console.log('🔐 Updating staff passwords...\n');
    let updated = 0;
    let notFound = 0;
    
    for (const staff of staffMembers) {
      const user = await db.collection('users').findOne({ email: staff.email });
      
      if (!user) {
        console.log(`   ❌ User not found: ${staff.email}`);
        notFound++;
        continue;
      }
      
      const hashedPassword = await bcrypt.hash(staff.password, 10);
      
      await db.collection('users').updateOne(
        { email: staff.email },
        { $set: { hashedPassword } }
      );
      
      console.log(`   ✅ Updated password for: ${staff.email}`);
      updated++;
    }
    
    console.log('\n✨ Password update completed!');
    console.log(`   - Updated: ${updated}`);
    console.log(`   - Not found: ${notFound}`);
    
    // Test one login
    console.log('\n🧪 Testing login for bhosale@gmail.com...');
    const testUser = await db.collection('users').findOne({ email: 'bhosale@gmail.com' });
    if (testUser && testUser.hashedPassword) {
      const isValid = await bcrypt.compare('bhosale', testUser.hashedPassword);
      console.log(`   Password test: ${isValid ? '✅ VALID' : '❌ INVALID'}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixStaffPasswords();
