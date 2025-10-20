import bcrypt from 'bcrypt';
import { firestore } from '../src/lib/firebase';
import { userService, COLLECTIONS } from "../src/lib/mongodb-services"';

async function clearFirebaseCollections() {
  console.log('🗑️  Clearing Firebase collections...\n');
  
  const collections = [
    COLLECTIONS.FEEDBACK,
    COLLECTIONS.HOD_SUGGESTIONS,
    COLLECTIONS.FACULTY_ASSIGNMENTS,
    COLLECTIONS.SUBJECTS,
    COLLECTIONS.STAFF,
    COLLECTIONS.ACADEMIC_YEARS,
    COLLECTIONS.DEPARTMENTS,
    COLLECTIONS.USERS,
  ];

  for (const collectionName of collections) {
    try {
      const snapshot = await firestore.collection(collectionName).get();
      const batch = firestore.batch();
      let count = 0;

      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
        count++;
      });

      if (count > 0) {
        await batch.commit();
        console.log(`   ✅ Deleted ${count} documents from ${collectionName}`);
      } else {
        console.log(`   ⚪ ${collectionName} was already empty`);
      }
    } catch (error) {
      console.error(`   ❌ Error clearing ${collectionName}:`, error);
    }
  }

  console.log('\n✅ Firebase collections cleared!\n');
}

async function createAdminUser() {
  console.log('🌱 Creating admin user...\n');

  try {
    // Hash password
    const hashedPassword = await bcrypt.hash('123', 10);

    // Create admin user
    await userService.create({
      email: 'admin@gmail.com',
      name: 'Administrator',
      role: 'ADMIN',
      hashedPassword,
    });

    console.log('✅ Admin user created successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('   Email:    admin@gmail.com');
    console.log('   Password: 123\n');

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    throw error;
  }
}

async function testLogin() {
  console.log('🧪 Testing login credentials...\n');

  try {
    // Get the user
    const user = await userService.findUnique({ email: 'admin@gmail.com' });
    
    if (!user) {
      console.error('❌ User not found!');
      return false;
    }

    // Verify password
    const isCorrectPassword = await bcrypt.compare('123', user.hashedPassword);
    
    if (isCorrectPassword) {
      console.log('✅ Login test successful!');
      console.log('   User details:');
      console.log(`   - ID: ${user.id}`);
      console.log(`   - Email: ${user.email}`);
      console.log(`   - Name: ${user.name}`);
      console.log(`   - Role: ${user.role}\n`);
      return true;
    } else {
      console.error('❌ Password verification failed!');
      return false;
    }

  } catch (error) {
    console.error('❌ Error testing login:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting database reset and seed...\n');
  console.log('=' .repeat(50));
  console.log('\n');

  try {
    // Step 1: Clear all Firebase collections
    await clearFirebaseCollections();

    // Step 2: Create admin user
    await createAdminUser();

    // Step 3: Test login
    const loginSuccess = await testLogin();

    console.log('=' .repeat(50));
    if (loginSuccess) {
      console.log('\n✅ Database reset completed successfully!');
      console.log('\n🎉 You can now login with:');
      console.log('   Email:    admin@gmail.com');
      console.log('   Password: 123\n');
    } else {
      console.log('\n⚠️  Database reset completed but login test failed!');
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Reset failed:', error);
    process.exit(1);
  }
}

main();
