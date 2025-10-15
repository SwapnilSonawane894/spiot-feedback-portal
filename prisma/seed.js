const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function main() {
  // Assumptions: admin password set to 'adminpassword' (change after first login)
  const adminPassword = "adminpassword";
  const adminHashed = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@gmail.com" },
    update: {},
    create: {
      name: "SPIOT Admin",
      email: "admin@gmail.com",
      hashedPassword: adminHashed,
      role: "ADMIN",
    },
  });
  console.log("Admin created:", admin.email, "password:", adminPassword);

  // HOD account
  const hodPassword = "12";
  const hodHashed = await bcrypt.hash(hodPassword, 10);
  const hodUser = await prisma.user.upsert({
    where: { email: "kharat@gmail.com" },
    update: {},
    create: {
      name: "Mrs. Kharat J. N.",
      email: "kharat@gmail.com",
      hashedPassword: hodHashed,
      role: "HOD",
    },
  });
  console.log("HOD created:", hodUser.email, "password:", hodPassword);

  // Create Department
  const dept = await prisma.department.upsert({
    where: { name: "Computer Engineering" },
    update: {},
    create: { name: "Computer Engineering", abbreviation: "CO" },
  });

  // Create an Academic Year and link subjects/students to it
  const academicYear = await prisma.academicYear.upsert({
    where: { abbreviation: "FYCO" },
    update: {},
    create: { name: "First Year Computer Engineering", abbreviation: "FYCO" },
  });

  // ensure HOD has a staff profile in the department
  const hodStaff = await prisma.staff.upsert({
    where: { userId: hodUser.id },
    update: {},
    create: {
      user: { connect: { id: hodUser.id } },
      department: { connect: { id: dept.id } },
    },
  });

  // attach HOD to department managed field
  try {
    await prisma.department.update({ where: { id: dept.id }, data: { hodId: hodStaff.id } });
  } catch (e) {
    // ignore
  }

  // Student account
  const studentPassword = "ss";
  const studentHashed = await bcrypt.hash(studentPassword, 10);
  const student = await prisma.user.upsert({
    where: { email: "swapnil@gmail.com" },
    update: {},
    create: {
      name: "swapnil",
      email: "swapnil@gmail.com",
      hashedPassword: studentHashed,
      role: "STUDENT",
    },
  });
  // associate student with department and academic year
  await prisma.user.update({ where: { id: student.id }, data: { departmentId: dept.id, academicYearId: academicYear.id } });

  // ensure a staff profile for the student exists (some parts of app expect it)
  await prisma.staff.upsert({
    where: { userId: student.id },
    update: {},
    create: { user: { connect: { id: student.id } }, department: { connect: { id: dept.id } } },
  });

  // Create a demo faculty user and staff profile for the department
  const facultyPassword = "facultypass";
  const facultyHashed = await bcrypt.hash(facultyPassword, 10);
  const faculty = await prisma.user.upsert({
    where: { email: "faculty@spiot.example" },
    update: {},
    create: { name: "Demo Faculty", email: "faculty@spiot.example", hashedPassword: facultyHashed, role: "HOD" },
  });
  const facultyStaff = await prisma.staff.upsert({
    where: { userId: faculty.id },
    update: {},
    create: { user: { connect: { id: faculty.id } }, department: { connect: { id: dept.id } } },
  });

  // create a subject for the academic year
  const subject = await prisma.subject.upsert({
    where: { subjectCode: "OOP101" },
    update: {},
    create: { name: "Object Oriented Programming", subjectCode: "OOP101", academicYear: { connect: { id: academicYear.id } } },
  });

  // create a faculty assignment linking the demo faculty and subject
  try {
    await prisma.facultyAssignment.create({ data: { semester: "Odd 2025-26", staff: { connect: { id: facultyStaff.id } }, subject: { connect: { id: subject.id } } } });
  } catch (e) {
    // ignore unique constraint errors
  }

  console.log("Student user created/upserted:", student.email, "password:", studentPassword);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
