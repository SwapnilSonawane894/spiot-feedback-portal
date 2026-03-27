import './src/lib/env-config.js';
import { userService } from './src/lib/mongodb-services.js';

async function updateTawarePassword() {
  try {
    console.log('Updating taware password in database...\n');

    const newHash = '$2b$10$NKYbVT7001/SCzcQVVz9zuIguHGvAAqc5YpwREgUBRjOnYqP9REbW';

    // First, find the user
    const user = await userService.findUnique({ email: 'taware@gmail.com' });

    if (!user) {
      console.log('❌ User taware@gmail.com not found');
      process.exit(1);
    }

    console.log('✓ User found:');
    console.log(`  - Name: ${user.name}`);
    console.log(`  - Email: ${user.email}`);
    console.log(`  - ID: ${user.id}`);

    // Update the password
    const result = await userService.update(
      { id: user.id },
      { hashedPassword: newHash }
    );

    console.log('\n✓ Password updated successfully!');
    console.log('\n📝 You can now login with:');
    console.log('   Email: taware@gmail.com');
    console.log('   Password: taware');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

updateTawarePassword();
