import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../src/prisma/client.js';
import { createCustomMuscleGroup, deleteCustomMuscleGroup, getAllMuscleGroups } from '../src/modules/exercises/muscle-group.service.js';

describe('Muscle Group Service (Integration)', () => {
  let user: any;

  beforeEach(async () => {
    user = await prisma.user.create({ data: { telegramId: 4n } });
  });

  it('should create a custom muscle group', async () => {
    const mg = await createCustomMuscleGroup(user.id, 'Neck');
    expect(mg.name).toBe('Neck');
    expect(mg.userId).toBe(user.id);
  });

  it('should get all muscle groups including user specific ones', async () => {
    await prisma.muscleGroup.create({ data: { name: 'Global MG' } });
    await createCustomMuscleGroup(user.id, 'User MG');
    
    const mgs = await getAllMuscleGroups(user.id);
    expect(mgs.some(m => m.name === 'Global MG')).toBe(true);
    expect(mgs.some(m => m.name === 'User MG')).toBe(true);

    const mgsNoUser = await getAllMuscleGroups();
    expect(mgsNoUser.some(m => m.name === 'Global MG')).toBe(true);
    expect(mgsNoUser.some(m => m.name === 'User MG')).toBe(false);
  });

  it('should delete custom muscle group if no exercises attached', async () => {
    const mg = await createCustomMuscleGroup(user.id, 'Delete Me');
    await deleteCustomMuscleGroup(user.id, mg.id);
    const mgs = await getAllMuscleGroups(user.id);
    expect(mgs.some(m => m.id === mg.id)).toBe(false);
  });

  it('should NOT delete custom muscle group if exercises attached', async () => {
    const mg = await createCustomMuscleGroup(user.id, 'Cannot Delete Me');
    await prisma.exercise.create({
      data: {
        name: 'Ex',
        userId: user.id,
        muscleGroupId: mg.id,
        isTemplate: true
      }
    });

    await expect(deleteCustomMuscleGroup(user.id, mg.id)).rejects.toThrow('Нельзя удалить группу мышц');
  });
});
