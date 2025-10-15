const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Edit this list to include userId/staffId pairs to remove
const targets = [
  { userId: 'cmgnqui460000i9mbleppgwtk', staffId: 'cmgnqui480001i9mbmam7y24p' },
  { userId: 'cmgnr9mzy0076i9zapf4dzvpu', staffId: 'cmgnr9mzy0077i9za8zlcdwwy' },
];

async function removeTarget(t) {
  console.log('Processing', t.userId, t.staffId);

  // Run each removal in a transaction for safety
  await prisma.$transaction(async (tx) => {
    // 1. Delete feedbacks for assignments belonging to this staff, then delete assignments
    const assignments = await tx.facultyAssignment.findMany({ where: { staffId: t.staffId }, select: { id: true } });
    const assignmentIds = assignments.map((a) => a.id);
    if (assignmentIds.length > 0) {
      const delFeedbacks = await tx.feedback.deleteMany({ where: { assignmentId: { in: assignmentIds } } });
      console.log('Deleted feedback rows tied to assignments:', delFeedbacks.count);

      const delAssignments = await tx.facultyAssignment.deleteMany({ where: { id: { in: assignmentIds } } });
      console.log('Deleted assignments:', delAssignments.count);
    } else {
      console.log('No assignments found for staff');
    }

    // 2. If this staff is hod of any department, nullify the hodId
    const updatedDepts = await tx.department.updateMany({ where: { hodId: t.staffId }, data: { hodId: null } });
    console.log('Cleared hodId from departments:', updatedDepts.count);

    // 3. Delete staff row (if exists)
    const delStaff = await tx.staff.deleteMany({ where: { id: t.staffId } });
    console.log('Deleted staff rows:', delStaff.count);

    // 4. Delete the user (this will cascade to accounts/sessions via Prisma onDelete cascade)
    const delUser = await tx.user.deleteMany({ where: { id: t.userId } });
    console.log('Deleted user rows:', delUser.count);
  });
}

async function main() {
  for (const t of targets) {
    try {
      await removeTarget(t);
      console.log('Removed:', t.userId);
    } catch (err) {
      console.error('Failed to remove', t, err);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
