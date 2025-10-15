const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function main() {
  const newPass = process.argv[2];
  if (!newPass) {
    console.error("Usage: node prisma/update-admin-password.js <new-password>");
    process.exit(1);
  }
  const hashed = await bcrypt.hash(newPass, 10);
  await prisma.user.updateMany({
    where: { email: "kharat@gmail.com" },
    data: { hashedPassword: hashed },
  });
  console.log("Admin password updated for admin@spiot.example");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});