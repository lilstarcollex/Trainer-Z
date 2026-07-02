import { Markup } from 'telegraf';
import { MyContext } from '../context.js';
import { getOrCreateUser } from '../../modules/users/user.service.js';
import { getActiveWorkout } from '../../modules/workouts/workout.service.js';

export const mainMenuKeyboard = Markup.keyboard([
  ['Начать тренировку', 'История'],
  ['Прогресс', 'Упражнения'],
  ['Настройки', 'Экспорт', 'Помощь']
]).resize();

export async function handleStart(ctx: MyContext) {
  if (!ctx.from) return;
  const telegramId = BigInt(ctx.from.id);
  
  const user = await getOrCreateUser(telegramId, ctx.from.username);
  
  const activeWorkout = await getActiveWorkout(user.id);

  if (activeWorkout) {
    await ctx.reply(
      `Привет! У тебя есть незавершённая тренировка (${activeWorkout.template.name}). Что делаем?`,
      Markup.inlineKeyboard([
        [Markup.button.callback('Продолжить активную', 'RESUME_WORKOUT')],
        [Markup.button.callback('Завершить старую', 'FINISH_WORKOUT')],
        [Markup.button.callback('Отменить старую', 'CANCEL_WORKOUT')]
      ])
    );
  } else {
    await ctx.reply('Привет! Я твой дневник тренировок. Выбирай действие:', mainMenuKeyboard);
  }
}
