const { PrismaClient } = require('@prisma/client');
(async () => {
  const prisma = new PrismaClient();
  try {
    const u = await prisma.user.findUnique({ where: { email: 'swapnil@gmail.com' } });
    console.log(u);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
})();
