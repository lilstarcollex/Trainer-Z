import { prisma } from '../../prisma/client.js';

export async function getAllExercises() {
  return prisma.exercise.findMany({
    orderBy: { name: 'asc' },
  });
}

export async function getExercisesGrouped() {
  const templates = await prisma.workoutTemplate.findMany({
    include: {
      exercises: {
        include: { exercise: true },
        orderBy: { order: 'asc' },
      },
    },
    orderBy: { code: 'asc' },
  });
  return templates;
}
