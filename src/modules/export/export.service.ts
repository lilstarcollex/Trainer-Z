import { prisma } from '../../prisma/client.js';
import { stringify } from 'csv-stringify/sync';

export async function exportUserDataJSON(userId: number) {
  const sessions = await prisma.workoutSession.findMany({
    where: { userId },
    include: {
      template: true,
      sets: {
        include: { exercise: true },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  return Buffer.from(JSON.stringify(sessions, null, 2), 'utf-8');
}

export async function exportUserDataCSV(userId: number) {
  const sessions = await prisma.workoutSession.findMany({
    where: { userId },
    include: {
      template: true,
      sets: {
        include: { exercise: true },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const records = [];
  records.push([
    'Session ID', 'Session Date', 'Template', 'Status',
    'Set ID', 'Exercise', 'Set Number', 'Weight (kg)', 'Reps',
    'Failure', 'Failure Rep', 'Difficulty', 'Comment'
  ]);

  for (const s of sessions) {
    if (s.sets.length === 0) {
      records.push([
        s.id, s.createdAt.toISOString(), s.template.name, s.status,
        '', '', '', '', '', '', '', '', ''
      ]);
    } else {
      for (const set of s.sets) {
        records.push([
          s.id, s.createdAt.toISOString(), s.template.name, s.status,
          set.id, set.exercise.name, set.setNumber, (set.weight / 1000).toFixed(2), set.reps,
          set.reachedFailure ? 'Yes' : 'No', set.failureRepNumber || '', set.difficulty, set.comment || ''
        ]);
      }
    }
  }

  const csvContent = stringify(records, {
    quoted_match: /[\r\n,"]/ // safely escape newlines and commas
  });
  return Buffer.from(csvContent, 'utf-8');
}
