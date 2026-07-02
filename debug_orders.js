const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log('Users in DB:');
  users.forEach(u => {
    console.log(`ID: ${u.id}, Name: ${u.name}, Email: ${u.email}, Phone: ${u.phone}, Role: ${u.role}, PasswordHash: ${u.password}`);
  });
}

main()
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect());
