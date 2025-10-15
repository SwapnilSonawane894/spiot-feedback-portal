const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('WARNING: This will delete ALL subjects, faculty assignments, and feedback rows from the database.');
  // Delete feedbacks first (they reference assignments)
  const delFeedback = await prisma.feedback.deleteMany({});
  console.log(`Deleted ${delFeedback.count} feedback row(s)`);

  // Delete faculty assignments next (they reference subjects)
  const delAssign = await prisma.facultyAssignment.deleteMany({});
  console.log(`Deleted ${delAssign.count} faculty assignment row(s)`);

  // Finally delete subjects
  const delSubj = await prisma.subject.deleteMany({});
  console.log(`Deleted ${delSubj.count} subject row(s)`);

  console.log('Clear subjects operation complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
