import { prisma } from '../../prisma/client.js';

export async function addSet(
  sessionId: number,
  exerciseId: number,
  weight: number, // grams
  reps: number,
  reachedFailure: boolean,
  failureRepNumber: number | null,
  difficulty: string,
  comment: string | null
) {
  // get current set number
  const lastSet = await prisma.workoutSet.findFirst({
    where: { sessionId, exerciseId },
    orderBy: { setNumber: 'desc' },
  });
  const setNumber = lastSet ? lastSet.setNumber + 1 : 1;

  return prisma.workoutSet.create({
    data: {
      sessionId,
      exerciseId,
      setNumber,
      weight,
      reps,
      reachedFailure,
      failureRepNumber,
      difficulty,
      comment,
    },
  });
}

export async function deleteLastSet(sessionId: number) {
  const lastSet = await prisma.workoutSet.findFirst({
    where: { sessionId },
    orderBy: { createdAt: 'desc' },
  });

  if (!lastSet) return null;

  return prisma.workoutSet.delete({
    where: { id: lastSet.id },
  });
}

export async function updateSet(
  setId: number,
  data: Partial<{
    weight: number;
    reps: number;
    reachedFailure: boolean;
    failureRepNumber: number | null;
    difficulty: string;
    comment: string | null;
  }>
) {
  return prisma.workoutSet.update({
    where: { id: setId },
    data,
  });
}
