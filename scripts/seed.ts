import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Hidden test account
  const testPassword = await bcrypt.hash('DDI5OKb@f5', 12);
  await prisma.user.upsert({
    where: { email: 'abacus-54756230@example.com' },
    update: { password: testPassword },
    create: {
      email: 'abacus-54756230@example.com',
      name: 'Admin Test',
      password: testPassword,
    },
  });

  console.log('Seed completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
