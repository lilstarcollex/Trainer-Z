import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../src/prisma/client.js';
import { startWorkout, finishWorkout, cancelWorkout } from '../src/modules/workouts/workout.service.js';

describe('Workout Service (Integration)', () => {
  let user: any;
  let template: any;
  let exercise: any;

  beforeEach(async () => {
    user = await prisma.user.create({ data: { telegramId: 5n } });
    template = await prisma.workoutTemplate.create({ data: { name: 'Тренировка B', userId: user.id } });
    exercise = await prisma.exercise.create({ data: { name: 'Присед', userId: user.id, isTemplate: true } });
  });

  it('should create a workout session', async () => {
    const session = await startWorkout(user.id, template.id);
    expect(session.userId).toBe(user.id);
    expect(session.templateId).toBe(template.id);
    expect(session.status).toBe('ACTIVE');
  });

  it('should complete a workout session', async () => {
    const session = await startWorkout(user.id, template.id);
    const completed = await finishWorkout(session.id);
    expect(completed.status).toBe('COMPLETED');
  });

  it('should cancel a workout session', async () => {
    const session = await startWorkout(user.id, template.id);
    const cancelled = await cancelWorkout(session.id);
    expect(cancelled.status).toBe('CANCELLED');
  });

  it('should cascade delete sets when session is deleted', async () => {
    const session = await startWorkout(user.id, template.id);
    await prisma.workoutSet.create({
      data: {
        sessionId: session.id,
        exerciseId: exercise.id,
        setNumber: 1,
        weight: 100000,
        reps: 10,
        reachedFailure: false,
        difficulty: 'Тяжело',
      }
    });

    const setsBefore = await prisma.workoutSet.count({ where: { sessionId: session.id } });
    expect(setsBefore).toBe(1);

    await prisma.workoutSession.delete({ where: { id: session.id } });

    const setsAfter = await prisma.workoutSet.count({ where: { sessionId: session.id } });
    expect(setsAfter).toBe(0);
  });
});
