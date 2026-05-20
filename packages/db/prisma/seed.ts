import { PrismaClient, Role, SessionType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const hashedPassword = await bcrypt.hash('password', 10);

  // Create an initial Admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@tamph.com' },
    update: {},
    create: {
      email: 'admin@tamph.com',
      name: 'Tamph Admin',
      passwordHash: hashedPassword,
      roles: [Role.ADMIN, Role.LECTURER],
    },
  });

  // Create a dummy course
  await prisma.course.create({
    data: {
      title: 'Python for Data Science Masterclass',
      description: 'Learn Python from scratch and master data science libraries like Pandas and NumPy.',
      isPublished: true,
      authorId: admin.id,
      modules: {
        create: [
          {
            title: 'Section 1: Introduction to Python',
            order: 1,
            sessions: {
              create: [
                {
                  title: 'Welcome to the Course',
                  type: SessionType.LESSON_TEXT,
                  order: 1,
                  content: '# Welcome to Python!\n\nIn this course, you will learn Python from the ground up. This is a text-based lesson where instructors can write Markdown.',
                },
                {
                  title: 'How Python Works (Video)',
                  type: SessionType.LESSON_VIDEO,
                  order: 2,
                  videoUrl: 'https://www.youtube.com/embed/xk4_1vDrzzo',
                },
                {
                  title: 'Your First Python Program',
                  type: SessionType.EXERCISE_CODING,
                  order: 3,
                  codingLanguage: 'python',
                  initialCode: 'def say_hello():\n    # Write code to print "Hello World!"\n    pass\n\nsay_hello()',
                  expectedOutput: 'Hello World!\n',
                }
              ]
            }
          }
        ]
      }
    }
  });

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
