import { Telegraf, Scenes } from 'telegraf';
import LocalSession from 'telegraf-session-local';
import { MyContext, MySession } from './context.js';
import { handleStart } from './handlers/start.handler.js';
import { handleMenuAction, handleHistoryDetails, handleProgressAction } from './handlers/menu.handler.js';
import { handleWorkoutActions } from './handlers/workout.handler.js';
import { logSetWizard } from './scenes/log-set.scene.js';

export function setupBot(token: string) {
  const bot = new Telegraf<MyContext>(token);

  // Setup local session
  const localSession = new LocalSession<MySession>({
    database: 'data/session_db.json',
    property: 'session',
    storage: LocalSession.storageFileAsync,
    format: {
      serialize: (obj) => JSON.stringify(obj, null, 2),
      deserialize: (str) => JSON.parse(str),
    },
  });
  bot.use(localSession.middleware());

  // Setup scenes
  const stage = new Scenes.Stage<MyContext>([logSetWizard]);
  bot.use(stage.middleware());

  // Global error handler
  bot.catch(async (err, ctx) => {
    console.error(`Ooops, encountered an error for ${ctx.updateType}`, err);
    try {
      await ctx.reply('Произошла внутренняя ошибка. Пожалуйста, попробуйте позже.');
    } catch (e) {
      console.error('Could not send error message to user:', e);
    }
  });

  // Handlers
  bot.start(handleStart);
  bot.on('text', handleMenuAction);

  // Callback queries
  bot.action(/^START_TEMPLATE_/, handleWorkoutActions);
  bot.action('RESUME_WORKOUT', handleWorkoutActions);
  bot.action('FINISH_WORKOUT', handleWorkoutActions);
  bot.action('CANCEL_WORKOUT', handleWorkoutActions);
  bot.action('PREV_EX', handleWorkoutActions);
  bot.action('NEXT_EX', handleWorkoutActions);
  bot.action('DELETE_LAST_SET', handleWorkoutActions);
  bot.action(/^LOG_SET_/, handleWorkoutActions);
  bot.action(/^HISTORY_DETAILS_/, handleHistoryDetails);
  bot.action(/^PROGRESS_EX_/, handleProgressAction);

  return bot;
}
