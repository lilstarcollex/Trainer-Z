import { prisma } from '../../prisma/client.js';

export async function getAllMuscleGroups(userId?: number) {
  return prisma.muscleGroup.findMany({
    where: userId ? { OR: [{ userId: null }, { userId }] } : { userId: null },
    orderBy: { name: 'asc' },
  });
}

export async function createCustomMuscleGroup(userId: number, name: string) {
  return prisma.muscleGroup.create({
    data: {
      name,
      userId,
    }
  });
}

export async function deleteCustomMuscleGroup(userId: number, muscleGroupId: number) {
  // Check if exercises are attached
  const attached = await prisma.exercise.count({
    where: { muscleGroupId }
  });
  if (attached > 0) {
    throw new Error('Нельзя удалить группу мышц, так как к ней привязаны упражнения.');
  }

  return prisma.muscleGroup.delete({
    where: { id: muscleGroupId, userId }
  });
}

export async function updateMuscleGroupName(muscleGroupId: number, name: string) {
  return prisma.muscleGroup.update({
    where: { id: muscleGroupId },
    data: { name }
  });
}

export async function getMuscleGroupById(muscleGroupId: number) {
  return prisma.muscleGroup.findUnique({
    where: { id: muscleGroupId }
  });
}
