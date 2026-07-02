import { Markup } from 'telegraf';
import { MyContext } from '../context.js';
import { getUser } from '../../modules/users/user.service.js';
import { getWorkoutHistory, getActiveWorkout } from '../../modules/workouts/workout.service.js';
import { getExerciseProgress } from '../../modules/progress/progress.service.js';
import { getExercisesGrouped, getAllExercises } from '../../modules/exercises/exercise.service.js';
import { exportUserDataJSON, exportUserDataCSV } from '../../modules/export/export.service.js';
import { showWorkoutMenu } from './workout.handler.js';

export async function handleMenuAction(ctx: MyContext) {
  if (!ctx.from || !ctx.message || !('text' in ctx.message)) return;
  
  const text = ctx.message.text;
  const user = await getUser(BigInt(ctx.from.id));
  if (!user) return;

  const active = await getActiveWorkout(user.id);

  if (active && text === '/workout') {
    return showWorkoutMenu(ctx);
  }

  if (text === 'Начать тренировку') {
    if (active) {
      await ctx.reply('У вас уже есть активная тренировка. Завершите или отмените её.', Markup.inlineKeyboard([
        [Markup.button.callback('Продолжить', 'RESUME_WORKOUT')]
      ]));
      return;
    }
    
    await ctx.reply('Выберите программу:', Markup.inlineKeyboard([
      [Markup.button.callback('A (Верх + Ноги)', 'START_TEMPLATE_A')],
      [Markup.button.callback('B (Ноги + Спина + Грудь)', 'START_TEMPLATE_B')],
      [Markup.button.callback('C (Сбалансированная)', 'START_TEMPLATE_C')],
    ]));
  } else if (text === 'История') {
    const history = await getWorkoutHistory(user.id, 5);
    if (history.length === 0) {
      await ctx.reply('История тренировок пуста.');
      return;
    }

    for (const session of history) {
      let msg = `Тренировка: ${session.template.name}\nДата: ${session.createdAt.toLocaleString()}\nСтатус: ${session.status}\n`;
      msg += `Подходов записано: ${session.sets.length}`;
      await ctx.reply(msg, Markup.inlineKeyboard([
        [Markup.button.callback('Детали', `HISTORY_DETAILS_${session.id}`)]
      ]));
    }
  } else if (text === 'Прогресс') {
    // Show first 10 exercises or so to not overload, or chunk them
    const exercises = await getAllExercises();
    
    const buttons = exercises.map(ex => [Markup.button.callback(ex.name, `PROGRESS_EX_${ex.id}`)]);
    
    // We send in chunks if it's too big, but inline keyboard can have up to 100 buttons.
    // 27 exercises is fine for one message.
    await ctx.reply('Выберите упражнение для просмотра прогресса:', Markup.inlineKeyboard(buttons));

  } else if (text === 'Упражнения') {
    const grouped = await getExercisesGrouped();
    let msg = '*Список упражнений:*\n\n';
    
    for (const template of grouped) {
      msg += `*${template.name}*\n`;
      for (const exLink of template.exercises) {
        msg += `- ${exLink.exercise.name} (${exLink.exercise.targetMuscle})\n`;
      }
      msg += '\n';
    }
    await ctx.reply(msg, { parse_mode: 'Markdown' });

  } else if (text === 'Экспорт') {
    await ctx.reply('Готовлю файлы экспорта...');
    try {
      const jsonBuffer = await exportUserDataJSON(user.id);
      const csvBuffer = await exportUserDataCSV(user.id);

      await ctx.replyWithDocument({ source: jsonBuffer, filename: 'workouts.json' });
      await ctx.replyWithDocument({ source: csvBuffer, filename: 'workouts.csv' });
    } catch (e) {
      console.error(e);
      await ctx.reply('Ошибка экспорта.');
    }
  } else if (text === 'Помощь' || text === '/help') {
    await ctx.reply('Это бот-дневник тренировок.\n- Жмите "Начать тренировку" чтобы выбрать программу.\n- Внутри тренировки записывайте подходы.\n- Вы можете экспортировать свои данные в любой момент.\n- Вес указывается в кг, бот сохраняет его надёжно.');
  }
}

export async function handleHistoryDetails(ctx: MyContext) {
  if (!ctx.from || !ctx.has('callback_query') || !ctx.callbackQuery) return;
  if (!('data' in ctx.callbackQuery)) return;
  const data = ctx.callbackQuery.data;

  if (data.startsWith('HISTORY_DETAILS_')) {
    const sessionId = parseInt(data.replace('HISTORY_DETAILS_', ''), 10);
    const { getWorkoutDetails } = await import('../../modules/workouts/workout.service.js');
    const details = await getWorkoutDetails(sessionId);

    if (!details) {
      await ctx.answerCbQuery('Тренировка не найдена.');
      return;
    }

    let msg = `*Тренировка:* ${details.template.name}\n\n`;
    let currentExId = -1;
    for (const set of details.sets) {
      if (set.exerciseId !== currentExId) {
        msg += `\n*${set.exercise.name}*\n`;
        currentExId = set.exerciseId;
      }
      msg += `${set.setNumber}. ${set.weight / 1000} кг х ${set.reps} `;
      if (set.reachedFailure) msg += `(Отказ на ${set.failureRepNumber}) `;
      msg += `[${set.difficulty}]`;
      if (set.comment) msg += ` - ${set.comment}`;
      msg += '\n';
    }

    // Split message if too long
    if (msg.length > 4000) {
      const parts = msg.match(/[\s\S]{1,4000}/g) || [];
      for (const part of parts) {
        await ctx.reply(part, { parse_mode: 'Markdown' });
      }
    } else {
      await ctx.reply(msg, { parse_mode: 'Markdown' });
    }
    await ctx.answerCbQuery();
  }
}

export async function handleProgressAction(ctx: MyContext) {
  if (!ctx.from || !ctx.has('callback_query') || !ctx.callbackQuery) return;
  if (!('data' in ctx.callbackQuery)) return;
  const data = ctx.callbackQuery.data;

  if (data.startsWith('PROGRESS_EX_')) {
    const user = await getUser(BigInt(ctx.from.id));
    if (!user) return;

    const exerciseId = parseInt(data.replace('PROGRESS_EX_', ''), 10);
    const progress = await getExerciseProgress(user.id, exerciseId);
    
    const { getAllExercises } = await import('../../modules/exercises/exercise.service.js');
    const exercises = await getAllExercises();
    const ex = exercises.find(e => e.id === exerciseId);

    if (!ex) {
      await ctx.answerCbQuery('Упражнение не найдено.');
      return;
    }

    let msg = `*Прогресс: ${ex.name}*\n\n`;
    if (progress.lastDate) {
      msg += `Лучший вес: ${progress.bestWeight / 1000} кг\n`;
      msg += `Лучшие повторы: ${progress.bestReps}\n`;
      msg += `Последний рабочий вес: ${progress.lastWeight / 1000} кг\n`;
      msg += `Дата: ${progress.lastDate.toLocaleDateString()}\n`;
      msg += `Динамика: ${progress.dynamics}`;
    } else {
      msg += `Динамика: ${progress.dynamics}`;
    }

    await ctx.reply(msg, { parse_mode: 'Markdown' });
    await ctx.answerCbQuery();
  }
}
