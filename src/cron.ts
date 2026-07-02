import cron from 'node-cron';
import { Telegraf } from 'telegraf';
import { getCompletedSessionsForLast24Hours, generateDailyAnalysis } from './modules/ai/ai.service.js';

export function startCronJobs(bot: Telegraf<any>) {
  // Run every day at 19:00 UTC (22:00 MSK)
  cron.schedule('0 22 * * *', async () => {
    console.log('Running daily AI analysis cron job...');
    try {
      const sessions = await getCompletedSessionsForLast24Hours();
      
      // Group sessions by user
      const userSessions = new Map<bigint, any[]>();
      for (const session of sessions) {
        const uid = session.user.telegramId;
        if (!userSessions.has(uid)) {
          userSessions.set(uid, []);
        }
        userSessions.get(uid)!.push(session);
      }

      for (const [telegramId, userSess] of userSessions.entries()) {
        // We analyze each session, or combine them. Let's just analyze the first one for MVP or loop.
        for (const session of userSess) {
          const analysis = await generateDailyAnalysis(session);
          await bot.telegram.sendMessage(telegramId.toString(), `🤖 *Ежесуточный AI-Анализ Тренировки:*\n\n${analysis}`, { parse_mode: 'Markdown' });
        }
      }
    } catch (e) {
      console.error('Error in daily cron job:', e);
    }
  }, { timezone: 'Europe/Moscow' });
  console.log('Cron jobs scheduled.');
}
