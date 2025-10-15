const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const hodUsers = await prisma.user.findMany({
    where: { role: 'HOD' },
    include: { staffProfile: true },
  });

  if (hodUsers.length === 0) {
    console.log('No users with role HOD found.');
    return;
  }

  for (const u of hodUsers) {
    const staff = u.staffProfile;
    if (!staff) {
      console.log(`USER ${u.id} ${u.email} -> role=HOD but no staffProfile`);
      continue;
    }

    const dept = await prisma.department.findFirst({ where: { hodId: staff.id } });
    const isRealHod = !!dept;
    console.log(`USER ${u.id} ${u.email} -> staffId=${staff.id} realHod=${isRealHod}${dept ? ' dept=' + dept.name : ''}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
