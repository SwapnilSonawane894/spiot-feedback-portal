const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const subs = await prisma.subject.findMany({ include: { academicYear: true } });
  if (!subs.length) return console.log('No subjects found');
  for (const s of subs) {
    console.log(`${s.name} | ${s.subjectCode} | ${s.academicYear?.abbreviation ?? s.academicYear?.name ?? '-'} (ayId=${s.academicYearId})`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
