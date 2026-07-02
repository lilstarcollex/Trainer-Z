import { prisma } from '../../prisma/client.js';

export async function getExerciseProgress(userId: number, exerciseId: number) {
  const sets = await prisma.workoutSet.findMany({
    where: {
      exerciseId,
      session: { userId, status: 'COMPLETED' },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (sets.length === 0) {
    return {
      bestWeight: 0,
      bestReps: 0,
      lastWeight: 0,
      lastDate: null,
      dynamics: 'мало данных',
    };
  }

  const bestWeight = Math.max(...sets.map(s => s.weight));
  const bestReps = Math.max(...sets.map(s => s.reps));
  
  const lastSet = sets[0];
  const lastWeight = lastSet.weight;
  const lastDate = lastSet.createdAt;

  // Simple dynamics: compare last session's max weight with previous session's max weight
  // Group sets by session
  const setsBySession = new Map<number, typeof sets>();
  for (const set of sets) {
    if (!setsBySession.has(set.sessionId)) {
      setsBySession.set(set.sessionId, []);
    }
    setsBySession.get(set.sessionId)!.push(set);
  }

  const sessionIds = Array.from(setsBySession.keys());
  let dynamics = 'мало данных';

  if (sessionIds.length >= 2) {
    // Assuming sessionIds are roughly ordered by date because of 'desc' order in sets
    const lastSessionSets = setsBySession.get(sessionIds[0])!;
    const prevSessionSets = setsBySession.get(sessionIds[1])!;

    const lastMax = Math.max(...lastSessionSets.map(s => s.weight));
    const prevMax = Math.max(...prevSessionSets.map(s => s.weight));

    if (lastMax > prevMax) {
      dynamics = 'есть прогресс';
    } else if (lastMax < prevMax) {
      dynamics = 'есть просадка';
    } else {
      // If weights are equal, check max reps
      const lastMaxReps = Math.max(...lastSessionSets.filter(s => s.weight === lastMax).map(s => s.reps));
      const prevMaxReps = Math.max(...prevSessionSets.filter(s => s.weight === prevMax).map(s => s.reps));
      if (lastMaxReps > prevMaxReps) {
        dynamics = 'есть прогресс';
      } else if (lastMaxReps < prevMaxReps) {
        dynamics = 'есть просадка';
      } else {
        dynamics = 'примерно без изменений';
      }
    }
  }

  return {
    bestWeight,
    bestReps,
    lastWeight,
    lastDate,
    dynamics,
  };
}
