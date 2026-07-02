import { describe, it, expect, beforeEach } from 'vitest';
import { exportUserDataJSON, exportUserDataCSV } from '../src/modules/export/export.service.js';
import { prisma } from '../src/prisma/client.js';

describe('Export Service (Integration)', () => {
  let user: any;
  let template: any;
  let exercise: any;
  let session: any;

  beforeEach(async () => {
    user = await prisma.user.create({ data: { telegramId: 3n } });
    template = await prisma.workoutTemplate.create({ data: { name: 'Тренировка A', userId: user.id } });
    exercise = await prisma.exercise.create({ data: { name: 'Жим', userId: user.id, isTemplate: true } });
    session = await prisma.workoutSession.create({ data: { userId: user.id, templateId: template.id, status: 'COMPLETED' } });
    await prisma.workoutSet.create({
      data: {
        sessionId: session.id,
        exerciseId: exercise.id,
        setNumber: 1,
        weight: 50000,
        reps: 10,
        reachedFailure: false,
        difficulty: 'Нормально',
        comment: 'Good',
      }
    });
  });

  it('should export valid JSON', async () => {
    const buffer = await exportUserDataJSON(user.id);
    const resultString = buffer.toString('utf-8');
    const parsed = JSON.parse(resultString);
    expect(parsed.length).toBe(1);
    expect(parsed[0].id).toBe(session.id);
    expect(parsed[0].sets[0].weight).toBe(50000);
  });

  it('should export valid CSV', async () => {
    const buffer = await exportUserDataCSV(user.id);
    const resultString = buffer.toString('utf-8');
    
    // Header check
    expect(resultString).toContain('Session ID');
    
    // Data check
    expect(resultString).toContain('Тренировка A');
    expect(resultString).toContain('COMPLETED');
    expect(resultString).toContain('Жим');
    expect(resultString).toContain('50.00'); // 50000 / 1000
    expect(resultString).toContain('Good');
  });
});
