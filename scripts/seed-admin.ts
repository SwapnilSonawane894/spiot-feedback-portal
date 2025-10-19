import bcrypt from 'bcrypt';
import { userService } from '../src/lib/firebase-services';

async function seedAdmin() {
  console.log('🌱 Creating admin user...\n');

  try {
    // Check if user already exists
    const existingUser = await userService.findUnique({ email: 'admin@gmail.com' });
    
    if (existingUser) {
      console.log('⚠️  Admin user already exists: admin@gmail.com');
      return;
    }

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

seedAdmin()
  .then(() => {
    console.log('✅ Seed completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  });
