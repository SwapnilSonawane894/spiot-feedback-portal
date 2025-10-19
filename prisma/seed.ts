import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...\n');

  try {
    // Clear existing data
    console.log('Clearing existing data...');
    await prisma.feedback.deleteMany({});
    await prisma.facultyAssignment.deleteMany({});
    await prisma.hodSuggestion.deleteMany({});
    await prisma.subject.deleteMany({});
    await prisma.staff.deleteMany({});
    await prisma.department.deleteMany({});
    await prisma.academicYear.deleteMany({});
    await prisma.account.deleteMany({});
    await prisma.session.deleteMany({});
    await prisma.user.deleteMany({});
    console.log('✅ Database cleared\n');

    // Create admin user
    console.log('Creating admin user...');
    const hashedPassword = await bcrypt.hash('123', 10);

    const admin = await prisma.user.create({
      data: {
        email: 'admin@gmail.com',
        name: 'Administrator',
        role: 'ADMIN',
        hashedPassword,
      },
    });

    console.log('✅ Admin user created successfully!');
    console.log(`   ID: ${admin.id}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Name: ${admin.name}`);
    console.log(`   Role: ${admin.role}\n`);

    console.log('✅ Seeding complete!\n');
    console.log('Login credentials:');
    console.log('   Email:    admin@gmail.com');
    console.log('   Password: 123\n');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
