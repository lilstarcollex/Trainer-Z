import { setupBot } from './src/bot/bot.js';
import { prisma } from './src/prisma/client.js';
import { startCronJobs } from './src/cron.js';
import * as aiService from './src/modules/ai/ai.service.js';

const bot = setupBot('dummy-token-for-simulation');

async function sendTextMessage(userId: number, text: string) {
  console.log(`\n[USER ${userId}]: ${text}`);
  await bot.handleUpdate({
    update_id: Date.now(),
    message: {
      message_id: Date.now(),
      from: { id: userId, is_bot: false, first_name: `User${userId}`, username: `user${userId}` },
      chat: { id: userId, type: 'private', first_name: `User${userId}` },
      date: Math.floor(Date.now() / 1000),
      text: text,
      entities: text.startsWith('/') ? [{ type: 'bot_command', offset: 0, length: text.length }] : undefined
    }
  } as any);
}

async function sendCallbackQuery(userId: number, data: string) {
  console.log(`\n[USER ${userId} CLICKS]: ${data}`);
  await bot.handleUpdate({
    update_id: Date.now(),
    callback_query: {
      id: Date.now().toString(),
      from: { id: userId, is_bot: false, first_name: `User${userId}`, username: `user${userId}` },
      message: {
        message_id: Date.now(),
        from: { id: 1, is_bot: true, first_name: 'Bot' },
        chat: { id: userId, type: 'private', first_name: `User${userId}` },
        date: Math.floor(Date.now() / 1000),
      },
      chat_instance: '123',
      data: data,
    }
  } as any);
}

// Mock telegram replies to bypass 404 API Error
bot.use(async (ctx, next) => {
  ctx.reply = async (text: string, ...args: any[]) => {
    console.log(`[BOT TO USER ${ctx.from?.id}]: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`);
    return { message_id: 1, date: 1, chat: { id: ctx.from?.id, type: 'private' }, text } as any;
  };
  ctx.answerCbQuery = async (text?: string, ...args: any[]) => {
    if (text) console.log(`[BOT TOAST TO ${ctx.from?.id}]: ${text}`);
    return true;
  };
  ctx.replyWithDocument = async (doc: any, ...args: any[]) => {
    console.log(`[BOT DOC TO ${ctx.from?.id}]: ${doc.filename}`);
    return { message_id: 1, date: 1, chat: { id: ctx.from?.id, type: 'private' } } as any;
  }
  ctx.telegram.sendMessage = async (chatId, text) => {
    console.log(`[BOT DIRECT MESSAGE TO ${chatId}]: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`);
    return { message_id: 1 } as any;
  }
  return next();
});

bot.botInfo = { id: 1, is_bot: true, first_name: 'Bot', username: 'bot' };
bot.telegram.getMe = async () => bot.botInfo as any;

async function runSmokeTest() {
  console.log('--- STARTING MULTI-USER SMOKE TEST ---');
  await prisma.$connect();

  // Initialize telegraf-session-local
  await new Promise(r => setTimeout(r, 1000));

  const userA = 11111;
  const userB = 22222;

  // 1. Create Users
  await sendTextMessage(userA, '/start');
  await sendTextMessage(userB, '/start');

  // 2. User A starts workout
  await sendTextMessage(userA, 'Начать тренировку');
  const templateA = await prisma.workoutTemplate.findFirst({ where: { userId: null } });
  if (!templateA) throw new Error('No template A');
  await sendCallbackQuery(userA, `START_TEMPLATE_${templateA.id}`);

  // 3. Log a valid set
  const activeA = await prisma.workoutSession.findFirst({ where: { status: 'ACTIVE', user: { telegramId: BigInt(userA) } }, include: { template: { include: { exercises: true } } } });
  const exIdA = activeA!.template.exercises[0].exerciseId;
  await sendCallbackQuery(userA, `LOG_SET_${exIdA}`);
  await sendTextMessage(userA, '100'); // 100kg
  await sendTextMessage(userA, '10');  // 10 reps
  await sendCallbackQuery(userA, 'FAILURE_NO');
  await sendCallbackQuery(userA, 'DIFF_NORMAL');
  await sendCallbackQuery(userA, 'SKIP_COMMENT');

  // 4. Log a fractional weight set
  await sendCallbackQuery(userA, `LOG_SET_${exIdA}`);
  await sendTextMessage(userA, '50.5'); // fractional weight
  await sendTextMessage(userA, '12'); 
  await sendCallbackQuery(userA, 'FAILURE_YES');
  await sendTextMessage(userA, '12'); 
  await sendCallbackQuery(userA, 'DIFF_HARD');
  await sendCallbackQuery(userA, 'SKIP_COMMENT');

  // 5. Try invalid data
  await sendCallbackQuery(userA, `LOG_SET_${exIdA}`);
  await sendTextMessage(userA, '600'); // > 500kg invalid
  await sendTextMessage(userA, '60');  // valid weight
  await sendTextMessage(userA, '0');   // 0 reps invalid
  await sendTextMessage(userA, '8');   // valid reps
  await sendCallbackQuery(userA, 'FAILURE_NO');
  await sendCallbackQuery(userA, 'DIFF_NORMAL');
  await sendCallbackQuery(userA, 'SKIP_COMMENT');

  // 6. User B tries to finish User A's workout (Isolation test)
  await sendCallbackQuery(userB, 'FINISH_WORKOUT'); // User B shouldn't finish User A's workout
  
  // 7. Finish User A's workout
  await sendCallbackQuery(userA, 'FINISH_WORKOUT');

  // 8. User B starts their own template
  const templateB = await prisma.workoutTemplate.findFirst({ where: { userId: null } });
  if (templateB) {
    await sendTextMessage(userB, 'Начать тренировку');
    await sendCallbackQuery(userB, `START_TEMPLATE_${templateB.id}`);
    await sendCallbackQuery(userB, 'CANCEL_WORKOUT'); // test cancel
  }

  // 9. Export & AI Digest 
  await sendTextMessage(userA, 'Экспорт');
  await sendCallbackQuery(userA, 'EXPORT_JSON');

  // 10. CRUDS - Test User B isolation
  // User B tries to delete User A's template
  await sendCallbackQuery(userB, `DELETE_TEMPLATE_${templateA.id}`); // Expect error or silent failure

  // 11. Run Cron Simulation (AI)
  console.log('\n[SYSTEM] Simulating Cron AI execution...');
  const oldOpenRouterKey = process.env.OPENROUTER_API_KEY;
  process.env.OPENROUTER_API_KEY = 'invalid_key'; // Test API error scenario
  // Trigger cron job manually
  const sessions = await aiService.getCompletedSessionsForLast24Hours();
  for (const session of sessions) {
      const analysis = await aiService.generateDailyAnalysis(session);
      await bot.telegram.sendMessage(Number(session.user.telegramId), `[CRON] ${analysis}`);
  }
  process.env.OPENROUTER_API_KEY = oldOpenRouterKey;

  console.log('--- SMOKE TEST COMPLETED ---');
  process.exit(0);
}

runSmokeTest().catch(console.error);
