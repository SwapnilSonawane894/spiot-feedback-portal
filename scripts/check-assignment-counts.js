#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const args = process.argv.slice(2);
    const userId = args[0];
    if (!userId) {
      console.error('Usage: node check-assignment-counts.js <hodUserId>');
      process.exit(1);
    }

    const staff = await prisma.staff.findUnique({ where: { userId } });
    if (!staff) {
      console.error('HOD staff profile not found for userId', userId);
      process.exit(1);
    }

    const assignments = await prisma.facultyAssignment.findMany({ where: { staff: { departmentId: staff.departmentId } }, include: { subject: { select: { academicYearId: true } } } });
    const counts = {};
    for (const a of assignments) {
      const y = a.subject?.academicYearId || 'unknown';
      counts[y] = (counts[y] || 0) + 1;
    }

    console.log('Assignment counts by academicYearId for department', staff.departmentId);
    for (const k of Object.keys(counts)) console.log(k, counts[k]);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
