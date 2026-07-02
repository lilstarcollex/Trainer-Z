import { describe, it, expect, beforeEach } from 'vitest';
import { updateTemplateName } from '../src/modules/workouts/workout.service.js';
import { updateExerciseName, updateExerciseMuscle } from '../src/modules/exercises/exercise.service.js';
import { prisma } from '../src/prisma/client.js';

describe('Edit Services (Integration)', () => {
  let user: any;
  let template: any;
  let muscle1: any;
  let muscle2: any;
  let exercise: any;

  beforeEach(async () => {
    user = await prisma.user.create({ data: { telegramId: 2n } });
    template = await prisma.workoutTemplate.create({ data: { name: 'Old Name', userId: user.id } });
    muscle1 = await prisma.muscleGroup.create({ data: { name: 'Muscle 1', userId: user.id } });
    muscle2 = await prisma.muscleGroup.create({ data: { name: 'Muscle 2', userId: user.id } });
    exercise = await prisma.exercise.create({ data: { name: 'Old Ex', muscleGroupId: muscle1.id, userId: user.id, isTemplate: true } });
  });

  it('should update template name', async () => {
    const res = await updateTemplateName(template.id, 'New Name');
    expect(res.name).toBe('New Name');
    const inDb = await prisma.workoutTemplate.findUnique({ where: { id: template.id } });
    expect(inDb?.name).toBe('New Name');
  });

  it('should update exercise name', async () => {
    const res = await updateExerciseName(exercise.id, 'New Ex');
    expect(res.name).toBe('New Ex');
    const inDb = await prisma.exercise.findUnique({ where: { id: exercise.id } });
    expect(inDb?.name).toBe('New Ex');
  });

  it('should update exercise muscleGroupId', async () => {
    const res = await updateExerciseMuscle(exercise.id, muscle2.id);
    expect(res.muscleGroupId).toBe(muscle2.id);
    const inDb = await prisma.exercise.findUnique({ where: { id: exercise.id } });
    expect(inDb?.muscleGroupId).toBe(muscle2.id);
  });
});
