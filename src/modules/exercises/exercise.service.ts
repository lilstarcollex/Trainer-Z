import { prisma } from '../../prisma/client.js';

export async function getAllExercises(userId?: number, muscleGroupId?: number) {
  const where: any = userId ? { OR: [{ userId: null }, { userId }] } : { userId: null };
  if (muscleGroupId !== undefined) {
    where.muscleGroupId = muscleGroupId;
  }
  return prisma.exercise.findMany({
    where,
    orderBy: { name: 'asc' },
    include: { muscleGroup: true }
  });
}

export async function getExercisesGrouped(userId?: number) {
  const templates = await prisma.workoutTemplate.findMany({
    where: userId ? { OR: [{ userId: null }, { userId }] } : { userId: null },
    include: {
      exercises: {
        include: { exercise: { include: { muscleGroup: true } } },
        orderBy: { order: 'asc' },
      },
    },
    orderBy: { code: 'asc' },
  });
  return templates;
}

export async function createCustomExercise(userId: number, name: string, muscleGroupId: number) {
  return prisma.exercise.create({
    data: {
      name,
      muscleGroupId,
      userId,
      isTemplate: false,
    }
  });
}

export async function deleteCustomExercise(userId: number, exerciseId: number) {
  return prisma.exercise.delete({
    where: { id: exerciseId, userId }
  });
}

export async function updateExerciseName(exerciseId: number, name: string) {
  return prisma.exercise.update({
    where: { id: exerciseId },
    data: { name }
  });
}

export async function updateExerciseMuscle(exerciseId: number, muscleGroupId: number) {
  return prisma.exercise.update({
    where: { id: exerciseId },
    data: { muscleGroupId }
  });
}

export async function getExerciseById(exerciseId: number) {
  return prisma.exercise.findUnique({
    where: { id: exerciseId },
    include: { muscleGroup: true }
  });
}
