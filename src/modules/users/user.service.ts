import { prisma } from '../../prisma/client.js';

export async function getOrCreateUser(telegramId: bigint, username?: string) {
  let user = await prisma.user.findUnique({ where: { telegramId } });
  if (!user) {
    user = await prisma.user.create({
      data: { telegramId, username },
    });
  }
  return user;
}

export async function getUser(telegramId: bigint) {
  return prisma.user.findUnique({ where: { telegramId } });
}
