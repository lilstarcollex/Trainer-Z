import { prisma } from '../../prisma/client.js';

export async function getActiveWorkout(userId: number) {
  return prisma.workoutSession.findFirst({
    where: { userId, status: 'ACTIVE' },
    include: {
      template: {
        include: {
          exercises: {
            include: { exercise: true },
            orderBy: { order: 'asc' },
          },
        },
      },
      sets: {
        orderBy: { createdAt: 'desc' },
        take: 1, // To easily know the last logged exercise
      },
    },
  });
}

export async function startWorkout(userId: number, templateCode: string) {
  const template = await prisma.workoutTemplate.findUnique({ where: { code: templateCode } });
  if (!template) throw new Error(`Template ${templateCode} not found`);

  return prisma.workoutSession.create({
    data: {
      userId,
      templateId: template.id,
      status: 'ACTIVE',
    },
  });
}

export async function finishWorkout(sessionId: number) {
  return prisma.workoutSession.update({
    where: { id: sessionId },
    data: { status: 'COMPLETED' },
  });
}

export async function cancelWorkout(sessionId: number) {
  return prisma.workoutSession.update({
    where: { id: sessionId },
    data: { status: 'CANCELLED' },
  });
}

export async function getWorkoutHistory(userId: number, limit = 5) {
  return prisma.workoutSession.findMany({
    where: { userId, status: { in: ['COMPLETED', 'ACTIVE'] } },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      template: true,
      sets: true,
    },
  });
}

export async function getWorkoutDetails(sessionId: number) {
  return prisma.workoutSession.findUnique({
    where: { id: sessionId },
    include: {
      template: true,
      sets: {
        include: { exercise: true },
        orderBy: [{ exerciseId: 'asc' }, { setNumber: 'asc' }],
      },
    },
  });
}
