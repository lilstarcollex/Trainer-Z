import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportUserDataJSON, exportUserDataCSV } from '../src/modules/export/export.service.js';
import { prisma } from '../src/prisma/client.js';

vi.mock('../src/prisma/client.js', () => ({
  prisma: {
    workoutSession: {
      findMany: vi.fn(),
    },
  },
}));

describe('Export Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockSessions = [
    {
      id: 1,
      userId: 1,
      status: 'COMPLETED',
      createdAt: new Date('2023-10-01T10:00:00Z'),
      template: { name: 'Тренировка A' },
      sets: [
        {
          id: 10,
          exercise: { name: 'Жим' },
          setNumber: 1,
          weight: 50000,
          reps: 10,
          reachedFailure: false,
          failureRepNumber: null,
          difficulty: 'Нормально',
          comment: 'Good',
        }
      ]
    }
  ];

  it('should export valid JSON', async () => {
    (prisma.workoutSession.findMany as any).mockResolvedValue(mockSessions);
    const buffer = await exportUserDataJSON(1);
    const resultString = buffer.toString('utf-8');
    const parsed = JSON.parse(resultString);
    expect(parsed.length).toBe(1);
    expect(parsed[0].id).toBe(1);
    expect(parsed[0].sets[0].weight).toBe(50000);
  });

  it('should export valid CSV', async () => {
    (prisma.workoutSession.findMany as any).mockResolvedValue(mockSessions);
    const buffer = await exportUserDataCSV(1);
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
