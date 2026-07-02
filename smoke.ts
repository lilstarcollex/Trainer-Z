import { setupBot } from './src/bot/bot.js';
import { prisma } from './src/prisma/client.js';

const bot = setupBot('dummy-token-for-simulation');
const userId = 123456789;

async function sendTextMessage(text: string) {
  console.log(`\n[USER]: ${text}`);
  await bot.handleUpdate({
    update_id: Date.now(),
    message: {
      message_id: Date.now(),
      from: { id: userId, is_bot: false, first_name: 'TestUser', username: 'testuser' },
      chat: { id: userId, type: 'private', first_name: 'TestUser' },
      date: Math.floor(Date.now() / 1000),
      text: text,
    }
  } as any);
}

async function sendCallbackQuery(data: string) {
  console.log(`\n[USER CLICKS]: ${data}`);
  await bot.handleUpdate({
    update_id: Date.now(),
    callback_query: {
      id: Date.now().toString(),
      from: { id: userId, is_bot: false, first_name: 'TestUser', username: 'testuser' },
      message: {
        message_id: Date.now(),
        from: { id: 1, is_bot: true, first_name: 'Bot' },
        chat: { id: userId, type: 'private', first_name: 'TestUser' },
        date: Math.floor(Date.now() / 1000),
      },
      chat_instance: '123',
      data: data,
    }
  } as any);
}

// Intercept bot replies for the smoke test log
bot.use(async (ctx, next) => {
  ctx.reply = async (text: string, ...args: any[]) => {
    console.log(`[BOT]: ${text}`);
    return { message_id: 1, date: 1, chat: { id: userId, type: 'private' }, text } as any;
  };
  ctx.answerCbQuery = async (text?: string, ...args: any[]) => {
    if (text) console.log(`[BOT TOAST]: ${text}`);
    return true;
  };
  ctx.replyWithDocument = async (doc: any, ...args: any[]) => {
    console.log(`[BOT DOC]: ${doc.filename}`);
    return { message_id: 1, date: 1, chat: { id: userId, type: 'private' } } as any;
  }
  return next();
});

// Mock getMe to avoid network calls
bot.botInfo = { id: 1, is_bot: true, first_name: 'Bot', username: 'bot' };
bot.telegram.getMe = async () => bot.botInfo as any;

async function runSmokeTest() {
  console.log('--- STARTING SMOKE TEST ---');
  await prisma.$connect();
  // 1. /start
  await sendTextMessage('/start');
  
  // 2. Начать тренировку
  await sendTextMessage('Начать тренировку');
  
  // 3. Выбрать тренировку A
  await sendCallbackQuery('START_TEMPLATE_A');
  
  // 4. Записать подход
  // We need to fetch the exercise ID from DB to send LOG_SET_xxx
  const activeWorkout = await prisma.workoutSession.findFirst({ where: { status: 'ACTIVE' }, include: { template: { include: { exercises: true } } } });
  if (!activeWorkout) throw new Error('No active workout found');
  const exId = activeWorkout.template.exercises[0].exerciseId;
  
  await sendCallbackQuery(`LOG_SET_${exId}`);
  
  // 5. Ввод веса (wizard step 1)
  await sendTextMessage('50');
  
  // 6. Ввод повторений (wizard step 2)
  await sendTextMessage('10');
  
  // 7. Отказ? Нет
  await sendCallbackQuery('FAILURE_NO');
  
  // 8. Сложность (wizard step 5)
  await sendCallbackQuery('DIFF_NORMAL');
  
  // 9. Комментарий
  await sendTextMessage('Smoke test set');
  
  // 10. Редактировать последний подход
  await sendCallbackQuery('EDIT_LAST_SET');
  await sendTextMessage('60'); // вес
  await sendTextMessage('8');  // повторы
  await sendCallbackQuery('FAILURE_YES'); // отказ
  await sendTextMessage('8');  // на каком
  await sendCallbackQuery('DIFF_HARD'); // сложность
  await sendCallbackQuery('SKIP_COMMENT'); // без коммента
  
  // 11. Удалить последний подход
  await sendCallbackQuery('DELETE_LAST_SET');
  
  // 12. Завершить тренировку
  await sendCallbackQuery('FINISH_WORKOUT');
  
  // 13. История
  await sendTextMessage('История');
  
  // 14. Прогресс
  await sendTextMessage('Прогресс');

  console.log('--- SMOKE TEST COMPLETED ---');
  process.exit(0);
}

runSmokeTest().catch(console.error);
