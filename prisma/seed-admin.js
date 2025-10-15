const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function main() {
  const password = "123";
  const hashed = await bcrypt.hash(password, 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@gmail.com" },
    update: {},
    create: {
      name: "SPIOT Admin",
      email: "admin@gmail.com",
      hashedPassword: hashed,
      role: "ADMIN",
    },
  });

  console.log("Admin upserted:", admin.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


//   admin@gmail.com- 123
// kharat@gmail.com - 12
// 23213070142 - same password
// bhosale@gmail.com - 12
// kadam@gmail.com - 12