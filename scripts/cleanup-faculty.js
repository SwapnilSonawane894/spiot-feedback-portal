const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Looking for staff rows whose linked user has role STUDENT...');

  const badStaff = await prisma.staff.findMany({
    where: { user: { role: 'STUDENT' } },
    include: { user: true },
  });

  if (!badStaff || badStaff.length === 0) {
    console.log('No staff rows referencing STUDENT users found.');
    return;
  }

  console.log(`Found ${badStaff.length} staff row(s) referencing STUDENT users:`);
  badStaff.forEach(s => console.log(`- staff.id=${s.id} user.email=${s.user?.email} user.id=${s.userId}`));

  for (const s of badStaff) {
    try {
      console.log(`Deleting assignments for staff id=${s.id}...`);
      const delAssign = await prisma.facultyAssignment.deleteMany({ where: { staffId: s.id } });
      console.log(`  deleted ${delAssign.count} assignment(s)`);

      console.log(`Deleting staff row id=${s.id}...`);
      await prisma.staff.delete({ where: { id: s.id } });
      console.log('  staff row deleted (user preserved)');
    } catch (err) {
      console.error('Failed to delete staff or assignments for', s.id, err);
    }
  }

  console.log('Cleanup completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
