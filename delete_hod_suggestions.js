const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    const res = await prisma.hodSuggestion.deleteMany();
    console.log('Deleted count:', res.count);
  } catch (err) {
    console.error('Error deleting hod suggestions:', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
