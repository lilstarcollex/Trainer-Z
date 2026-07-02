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

export async function getAllTemplates(userId?: number) {
  return prisma.workoutTemplate.findMany({
    where: userId ? { OR: [{ userId: null }, { userId }] } : { userId: null },
    orderBy: { id: 'asc' },
  });
}

export async function createCustomTemplate(userId: number, name: string, exerciseIds: number[]) {
  const template = await prisma.workoutTemplate.create({
    data: {
      name,
      userId,
    }
  });

  const mappings = exerciseIds.map((exId, idx) => ({
    templateId: template.id,
    exerciseId: exId,
    order: idx + 1,
  }));

  await prisma.workoutTemplateExercise.createMany({
    data: mappings
  });

  return template;
}

export async function deleteCustomTemplate(userId: number, templateId: number) {
  return prisma.workoutTemplate.delete({
    where: { id: templateId, userId }
  });
}

export async function startWorkout(userId: number, templateId: number) {
  const template = await prisma.workoutTemplate.findUnique({ where: { id: templateId } });
  if (!template) throw new Error(`Template ${templateId} not found`);

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

export async function updateTemplateName(templateId: number, name: string) {
  return prisma.workoutTemplate.update({
    where: { id: templateId },
    data: { name }
  });
}

export async function addExerciseToTemplate(templateId: number, exerciseId: number) {
  // Find current max order
  const maxOrderObj = await prisma.workoutTemplateExercise.findFirst({
    where: { templateId },
    orderBy: { order: 'desc' },
  });
  const newOrder = maxOrderObj ? maxOrderObj.order + 1 : 1;

  return prisma.workoutTemplateExercise.create({
    data: {
      templateId,
      exerciseId,
      order: newOrder,
    }
  });
}

export async function removeExerciseFromTemplate(templateId: number, exerciseId: number) {
  return prisma.workoutTemplateExercise.delete({
    where: {
      templateId_exerciseId: {
        templateId,
        exerciseId
      }
    }
  });
}

export async function getTemplateById(templateId: number) {
  return prisma.workoutTemplate.findUnique({
    where: { id: templateId },
    include: {
      exercises: {
        include: { exercise: true },
        orderBy: { order: 'asc' }
      }
    }
  });
}
