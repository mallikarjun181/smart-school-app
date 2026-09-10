const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

prisma.user.count()
  .then(count => console.log("USER COUNT:", count))
  .catch(error => console.error("DB ERROR:", error.message))
  .finally(() => prisma.$disconnect());
