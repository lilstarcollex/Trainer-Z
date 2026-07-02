import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../src/prisma/client.js';
import { deleteCustomTemplate } from '../src/modules/workouts/workout.service.js';

describe('User Isolation and CRUDS', () => {
  let userA: any;
  let userB: any;

  beforeEach(async () => {
    // Users are created via telegramId in actual code
    userA = await prisma.user.create({ data: { telegramId: 999111n, username: 'userA' } });
    userB = await prisma.user.create({ data: { telegramId: 999222n, username: 'userB' } });
  });

  it('should prevent User B from deleting User A template', async () => {
    const templateA = await prisma.workoutTemplate.create({
      data: { name: 'A Template', userId: userA.id }
    });

    // Attempt to delete with User B's ID should fail
    await expect(deleteCustomTemplate(userB.id, templateA.id)).rejects.toThrow();
    
    // Verify template A still exists
    const check = await prisma.workoutTemplate.findUnique({ where: { id: templateA.id } });
    expect(check).not.toBeNull();
  });
});
