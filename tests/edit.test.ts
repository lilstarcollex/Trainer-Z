import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateTemplateName, updateExerciseName, updateExerciseMuscle } from '../src/modules/workouts/workout.service.js';
import { prisma } from '../src/prisma/client.js';

// We just test the updateExerciseName and updateExerciseMuscle functions from exercise service
// Wait, we imported them from workout service which is wrong in the import, let's fix it below.
import { updateExerciseName as uen, updateExerciseMuscle as uem } from '../src/modules/exercises/exercise.service.js';

vi.mock('../src/prisma/client.js', () => ({
  prisma: {
    workoutTemplate: {
      update: vi.fn(),
    },
    exercise: {
      update: vi.fn(),
    }
  }
}));

describe('Edit Services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update template name', async () => {
    vi.mocked(prisma.workoutTemplate.update).mockResolvedValue({ id: 1, name: 'New Name' } as any);
    const res = await updateTemplateName(1, 'New Name');
    expect(res.name).toBe('New Name');
    expect(prisma.workoutTemplate.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { name: 'New Name' }
    });
  });

  it('should update exercise name', async () => {
    vi.mocked(prisma.exercise.update).mockResolvedValue({ id: 1, name: 'New Name' } as any);
    const res = await uen(1, 'New Name');
    expect(res.name).toBe('New Name');
    expect(prisma.exercise.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { name: 'New Name' }
    });
  });

  it('should update exercise muscleGroupId', async () => {
    const { updateExerciseMuscle: uem } = await import('../src/modules/exercises/exercise.service.js');
    (prisma.exercise.update as any).mockResolvedValue({ id: 1, name: 'Squat', muscleGroupId: 5 });
    
    const res = await uem(1, 5);
    expect(res.muscleGroupId).toBe(5);
    expect(prisma.exercise.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { muscleGroupId: 5 }
    });
  });
});
