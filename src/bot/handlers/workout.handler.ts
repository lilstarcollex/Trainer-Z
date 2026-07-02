import { Markup } from 'telegraf';
import { MyContext } from '../context.js';
import { getActiveWorkout, startWorkout, finishWorkout, cancelWorkout } from '../../modules/workouts/workout.service.js';
import { deleteLastSet } from '../../modules/workouts/set.service.js';
import { getUser } from '../../modules/users/user.service.js';
import { mainMenuKeyboard } from './start.handler.js';

export async function showWorkoutMenu(ctx: MyContext) {
  if (!ctx.from) return;
  const user = await getUser(BigInt(ctx.from.id));
  if (!user) return;

  const active = await getActiveWorkout(user.id);
  if (!active) {
    await ctx.reply('Нет активной тренировки.', mainMenuKeyboard);
    return;
  }

  const exercises = active.template.exercises;
  
  // Find current exercise based on ctx.session.currentExerciseIndex
  let currentIndex = ctx.session.currentExerciseIndex || 0;
  if (currentIndex >= exercises.length) {
    currentIndex = exercises.length - 1; // max
  }

  const currentExercise = exercises[currentIndex];
  
  // Show info
  await ctx.reply(
    `Тренировка: ${active.template.name}\nУпражнение ${currentIndex + 1} из ${exercises.length}: *${currentExercise.exercise.name}*\n\nЧто делаем?`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('Записать подход', `LOG_SET_${currentExercise.exercise.id}`)],
        [
          Markup.button.callback('⬅️ Пред.', 'PREV_EX'),
          Markup.button.callback('След. ➡️', 'NEXT_EX')
        ],
        [
          Markup.button.callback('Удалить последний', 'DELETE_LAST_SET'),
          Markup.button.callback('Редактировать последний', 'EDIT_LAST_SET')
        ],
        [Markup.button.callback('Завершить тренировку', 'FINISH_WORKOUT')],
        [Markup.button.callback('Отменить тренировку', 'CANCEL_WORKOUT')]
      ])
    }
  );
}

export async function handleWorkoutActions(ctx: MyContext) {
  if (!ctx.from || !ctx.has('callback_query') || !ctx.callbackQuery) return;
  if (!('data' in ctx.callbackQuery)) return;

  const user = await getUser(BigInt(ctx.from.id));
  if (!user) return;

  const data = ctx.callbackQuery.data;

  if (data === 'RESUME_WORKOUT') {
    await ctx.answerCbQuery();
    await showWorkoutMenu(ctx);
  } else if (data === 'FINISH_WORKOUT') {
    const active = await getActiveWorkout(user.id);
    if (active) {
      await finishWorkout(active.id);
      await ctx.answerCbQuery('Тренировка завершена!');
      await ctx.reply('Тренировка успешно сохранена.', mainMenuKeyboard);
    }
  } else if (data === 'CANCEL_WORKOUT') {
    const active = await getActiveWorkout(user.id);
    if (active) {
      await cancelWorkout(active.id);
      await ctx.answerCbQuery('Тренировка отменена!');
      await ctx.reply('Тренировка отменена.', mainMenuKeyboard);
    }
  } else if (data === 'PREV_EX') {
    ctx.session.currentExerciseIndex = Math.max(0, (ctx.session.currentExerciseIndex || 0) - 1);
    await ctx.answerCbQuery();
    await showWorkoutMenu(ctx);
  } else if (data === 'NEXT_EX') {
    const active = await getActiveWorkout(user.id);
    if (active) {
      ctx.session.currentExerciseIndex = Math.min(active.template.exercises.length - 1, (ctx.session.currentExerciseIndex || 0) + 1);
    }
    await ctx.answerCbQuery();
    await showWorkoutMenu(ctx);
  } else if (data === 'DELETE_LAST_SET') {
    const active = await getActiveWorkout(user.id);
    if (active) {
      const deleted = await deleteLastSet(active.id);
      if (deleted) {
        await ctx.answerCbQuery('Последний подход удалён.');
      } else {
        await ctx.answerCbQuery('Нет подходов для удаления.');
      }
    }
    await showWorkoutMenu(ctx);
  } else if (data === 'EDIT_LAST_SET') {
    const active = await getActiveWorkout(user.id);
    if (active) {
      const { prisma } = await import('../../prisma/client.js');
      const lastSet = await prisma.workoutSet.findFirst({
        where: { sessionId: active.id },
        orderBy: { createdAt: 'desc' },
      });
      if (lastSet) {
        ctx.session.workoutSessionId = active.id;
        ctx.session.logSetState = { 
          exerciseId: lastSet.exerciseId,
          isEdit: true,
          setId: lastSet.id
        } as any;
        await ctx.answerCbQuery();
        await ctx.scene.enter('LOG_SET_WIZARD');
      } else {
        await ctx.answerCbQuery('Нет подходов для редактирования.', { show_alert: true });
      }
    }
  } else if (data.startsWith('LOG_SET_')) {
    const exerciseId = parseInt(data.replace('LOG_SET_', ''), 10);
    const active = await getActiveWorkout(user.id);
    if (active) {
      ctx.session.workoutSessionId = active.id;
      ctx.session.logSetState = { exerciseId };
      await ctx.answerCbQuery();
      await ctx.scene.enter('LOG_SET_WIZARD');
    }
  } else if (data.startsWith('START_TEMPLATE_')) {
    const templateId = parseInt(data.replace('START_TEMPLATE_', ''), 10);
    const active = await getActiveWorkout(user.id);
    if (active) {
      await ctx.answerCbQuery('У вас уже есть активная тренировка!', { show_alert: true });
      return;
    }
    await startWorkout(user.id, templateId);
    ctx.session.currentExerciseIndex = 0;
    await ctx.answerCbQuery();
    await showWorkoutMenu(ctx);
  }
}
