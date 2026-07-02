import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getExerciseProgress } from '../src/modules/progress/progress.service.js';
import { prisma } from '../src/prisma/client.js';

vi.mock('../src/prisma/client.js', () => ({
  prisma: {
    workoutSet: {
      findMany: vi.fn(),
    },
  },
}));

describe('Progress Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return default values if no sets found', async () => {
    (prisma.workoutSet.findMany as any).mockResolvedValue([]);
    const progress = await getExerciseProgress(1, 1);
    expect(progress).toEqual({
      bestWeight: 0,
      bestReps: 0,
      lastWeight: 0,
      lastDate: null,
      dynamics: 'мало данных',
    });
  });

  it('should calculate progress correctly with data', async () => {
    const mockSets = [
      { weight: 60000, reps: 8, sessionId: 2, createdAt: new Date('2023-10-02') },
      { weight: 60000, reps: 7, sessionId: 2, createdAt: new Date('2023-10-02') },
      { weight: 50000, reps: 10, sessionId: 1, createdAt: new Date('2023-10-01') },
      { weight: 50000, reps: 8, sessionId: 1, createdAt: new Date('2023-10-01') },
    ];
    (prisma.workoutSet.findMany as any).mockResolvedValue(mockSets);
    const progress = await getExerciseProgress(1, 1);
    
    expect(progress.bestWeight).toBe(60000);
    expect(progress.bestReps).toBe(10);
    expect(progress.lastWeight).toBe(60000);
    expect(progress.dynamics).toBe('есть прогресс');
  });

  it('should calculate degradation correctly', async () => {
    const mockSets = [
      { weight: 40000, reps: 8, sessionId: 2, createdAt: new Date('2023-10-02') },
      { weight: 50000, reps: 10, sessionId: 1, createdAt: new Date('2023-10-01') },
    ];
    (prisma.workoutSet.findMany as any).mockResolvedValue(mockSets);
    const progress = await getExerciseProgress(1, 1);
    
    expect(progress.dynamics).toBe('есть просадка');
  });
});
