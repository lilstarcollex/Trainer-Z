import { beforeAll, afterAll, afterEach } from 'vitest';
import { prisma } from '../src/prisma/client.js';

beforeAll(async () => {
  // Add any one-time setup here if necessary
});

afterAll(async () => {
  await prisma.$disconnect();
});

afterEach(async () => {
  // Clean up database after each test
  const tableNames = ['WorkoutSet', 'WorkoutSession', 'WorkoutTemplateExercise', 'WorkoutTemplate', 'Exercise', 'MuscleGroup', 'User'];
  for (const tableName of tableNames) {
    await prisma.$executeRawUnsafe(`DELETE FROM "${tableName}";`);
  }
});
