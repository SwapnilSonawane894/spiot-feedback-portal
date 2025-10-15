#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const args = process.argv.slice(2);
    const all = args.includes('--all');
    const deptIdx = args.indexOf('--departmentId');
    const yearIdx = args.indexOf('--yearId');

    if (!all && deptIdx === -1 && yearIdx === -1) {
      console.log('Usage: node clear-feedbacks.js --all | --departmentId <id> | --yearId <id>');
      process.exit(1);
    }

    let where = {};
    if (all) {
      where = {};
    } else if (deptIdx !== -1) {
      const departmentId = args[deptIdx + 1];
      if (!departmentId) {
        console.error('Missing departmentId value');
        process.exit(1);
      }
      // feedbacks where assignment.staff.departmentId == departmentId
      where = { assignment: { staff: { departmentId } } };
    } else if (yearIdx !== -1) {
      const yearId = args[yearIdx + 1];
      if (!yearId) {
        console.error('Missing yearId value');
        process.exit(1);
      }
      // feedbacks where assignment.subject.academicYearId == yearId
      where = { assignment: { subject: { academicYearId: yearId } } };
    }

    const before = await prisma.feedback.count();
    const res = await prisma.feedback.deleteMany({ where });
    const after = await prisma.feedback.count();
    console.log(`DELETED:${res.count} BEFORE:${before} AFTER:${after}`);
  } catch (e) {
    console.error('Error clearing feedbacks', e);
    process.exit(1);
  } finally {
    try { await prisma.$disconnect(); } catch (e) {}
  }
}

main();
