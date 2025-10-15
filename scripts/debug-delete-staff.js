#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const args = process.argv.slice(2);
    const id = args[0];

    if (!id) {
      console.log('No staff id provided. Listing staff profiles:');
      const staff = await prisma.staff.findMany({ include: { user: true } });
      staff.forEach((s) => {
        console.log(`${s.id} | userId=${s.userId} | name=${s.user?.name || '-'} | email=${s.user?.email || '-'} | dept=${s.departmentId}`);
      });
      console.log('\nRun with: node debug-delete-staff.js <staffId> to attempt deletion');
      process.exit(0);
    }

    console.log('Attempting to delete staff with id:', id);
    const staff = await prisma.staff.findUnique({ where: { id } });
    if (!staff) {
      console.error('Staff not found');
      process.exit(1);
    }

    try {
      const delAssign = await prisma.facultyAssignment.deleteMany({ where: { staffId: staff.id } });
      console.log('Deleted assignments:', delAssign.count);
    } catch (e) {
      console.warn('Failed to delete assignments (non-fatal):', e.message || e);
    }

    try {
      await prisma.staff.delete({ where: { id: staff.id } });
      console.log('Deleted staff record');
    } catch (e) {
      console.error('Error deleting staff record:', e.message || e);
      console.error(e.stack);
      process.exit(1);
    }

    try {
      await prisma.user.delete({ where: { id: staff.userId } });
      console.log('Deleted associated user record:', staff.userId);
    } catch (e) {
      console.error('Error deleting user record:', e.message || e);
      console.error(e.stack);
      process.exit(1);
    }

    console.log('Finished deletion attempt successfully.');
  } catch (e) {
    console.error('Unexpected error:', e.message || e);
    console.error(e.stack);
    process.exit(1);
  } finally {
    try { await prisma.$disconnect(); } catch (e) {}
  }
}

main();
