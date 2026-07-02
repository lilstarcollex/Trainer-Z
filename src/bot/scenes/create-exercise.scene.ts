import { Scenes, Markup } from 'telegraf';
import { MyContext } from '../context.js';
import { createCustomExercise } from '../../modules/exercises/exercise.service.js';
import { getAllMuscleGroups } from '../../modules/exercises/muscle-group.service.js';

export const createExerciseWizard = new Scenes.WizardScene<MyContext>(
  'CREATE_EXERCISE_WIZARD',
  async (ctx) => {
    await ctx.reply('Введите название упражнения:', Markup.inlineKeyboard([
      Markup.button.callback('Отмена', 'CANCEL')
    ]));
    ctx.session.createExerciseState = {};
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (ctx.has('callback_query') && ctx.callbackQuery && 'data' in ctx.callbackQuery && ctx.callbackQuery.data === 'CANCEL') {
      await ctx.answerCbQuery('Отменено');
      await ctx.reply('Создание отменено.');
      return ctx.scene.leave();
    }
    if (!ctx.message || !('text' in ctx.message)) return;
    
    const text = ctx.message.text.trim();
    if (text === '/cancel') {
      await ctx.reply('Создание отменено.');
      return ctx.scene.leave();
    }
    if (text.length < 2) {
      await ctx.reply('Слишком короткое название. Введите хотя бы 2 символа:');
      return;
    }

    ctx.session.createExerciseState!.name = text;

    const groups = await getAllMuscleGroups(ctx.from?.id);
    const buttons = groups.map(g => [Markup.button.callback(g.name, `GROUP_${g.id}`)]);
    buttons.push([Markup.button.callback('Отмена', 'CANCEL')]);

    await ctx.reply('Выберите целевую группу мышц:', Markup.inlineKeyboard(buttons));
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (!ctx.has('callback_query') || !ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;
    const data = ctx.callbackQuery.data;

    if (data === 'CANCEL') {
      await ctx.answerCbQuery('Отменено');
      await ctx.reply('Создание отменено.');
      return ctx.scene.leave();
    }

    if (!data.startsWith('GROUP_')) return;
    const groupId = parseInt(data.replace('GROUP_', ''), 10);
    
    const name = ctx.session.createExerciseState!.name!;

    if (ctx.from) {
      await createCustomExercise(ctx.from.id, name, groupId);
      await ctx.answerCbQuery('Упражнение создано!');
      await ctx.reply(`Упражнение "${name}" успешно создано!`);
    }

    return ctx.scene.leave();
  }
);
