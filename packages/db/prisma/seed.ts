import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create an initial Admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@tamph.com' },
    update: {},
    create: {
      email: 'admin@tamph.com',
      name: 'Tamph Admin',
      // In a real app, hash this password with bcrypt!
      passwordHash: 'hashed_password_placeholder',
      roles: [Role.ADMIN],
    },
  });

  console.log({ admin });
  console.log('Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
