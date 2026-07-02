import { Scenes, Markup } from 'telegraf';
import { MyContext } from '../context.js';
import { createCustomTemplate } from '../../modules/workouts/workout.service.js';
import { getAllExercises } from '../../modules/exercises/exercise.service.js';
import { getAllMuscleGroups } from '../../modules/exercises/muscle-group.service.js';

export const createTemplateWizard = new Scenes.WizardScene<MyContext>(
  'CREATE_TEMPLATE_WIZARD',
  async (ctx) => {
    await ctx.reply('Введите название новой программы (например, "День 1: Спина и Бицепс"):', Markup.inlineKeyboard([
      Markup.button.callback('Отмена', 'CANCEL')
    ]));
    ctx.session.createTemplateState = { exerciseIds: [] };
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (ctx.has('callback_query') && ctx.callbackQuery && 'data' in ctx.callbackQuery && ctx.callbackQuery.data === 'CANCEL') {
      await ctx.answerCbQuery('Отменено');
      await ctx.reply('Создание отменено.');
      return ctx.scene.leave();
    }
    if (!ctx.message || !('text' in ctx.message)) return;

    const name = ctx.message.text.trim();
    if (name === '/cancel') {
      await ctx.reply('Создание отменено.');
      return ctx.scene.leave();
    }
    if (name.length < 2) {
      await ctx.reply('Слишком короткое название. Введите хотя бы 2 символа:');
      return;
    }

    ctx.session.createTemplateState!.name = name;

    const groups = await getAllMuscleGroups(ctx.from?.id);
    const buttons = groups.map(g => [Markup.button.callback(g.name, `GROUP_${g.id}`)]);
    buttons.push([Markup.button.callback('✅ Готово (Сохранить программу)', 'DONE')]);

    await ctx.reply('Добавление упражнений.\nВыберите группу мышц:', Markup.inlineKeyboard(buttons));
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (!ctx.has('callback_query') || !ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;
    const data = ctx.callbackQuery.data;

    if (data === 'DONE') {
      const state = ctx.session.createTemplateState!;
      if (!state.exerciseIds || state.exerciseIds.length === 0) {
        await ctx.answerCbQuery('Программа пуста!');
        await ctx.reply('Вы не добавили ни одного упражнения. Программа не создана.');
        return ctx.scene.leave();
      }

      if (ctx.from) {
        await createCustomTemplate(ctx.from.id, state.name!, state.exerciseIds);
        await ctx.answerCbQuery('Программа сохранена!');
        await ctx.reply(`Программа "${state.name}" успешно создана и содержит ${state.exerciseIds.length} упражнений!`);
      }
      return ctx.scene.leave();
    }

    if (data.startsWith('GROUP_')) {
      const groupId = parseInt(data.replace('GROUP_', ''), 10);
      const exercises = await getAllExercises(ctx.from?.id, groupId);
      
      if (exercises.length === 0) {
        await ctx.answerCbQuery('В этой группе пока нет упражнений.');
        return;
      }

      const buttons = exercises.map(ex => [Markup.button.callback(ex.name, `PICK_EX_${ex.id}`)]);
      buttons.push([Markup.button.callback('⬅️ Назад к группам', 'BACK_TO_GROUPS')]);

      await ctx.editMessageText('Выберите упражнение:', Markup.inlineKeyboard(buttons));
      return;
    }

    if (data === 'BACK_TO_GROUPS') {
      const groups = await getAllMuscleGroups(ctx.from?.id);
      const buttons = groups.map(g => [Markup.button.callback(g.name, `GROUP_${g.id}`)]);
      buttons.push([Markup.button.callback('✅ Готово (Сохранить программу)', 'DONE')]);
      await ctx.editMessageText('Добавление упражнений.\nВыберите группу мышц:', Markup.inlineKeyboard(buttons));
      return;
    }

    if (data.startsWith('PICK_EX_')) {
      const exId = parseInt(data.replace('PICK_EX_', ''), 10);
      const state = ctx.session.createTemplateState!;
      state.exerciseIds!.push(exId);
      
      await ctx.answerCbQuery(`Добавлено! (Всего: ${state.exerciseIds!.length})`);
      
      // Go back to groups
      const groups = await getAllMuscleGroups(ctx.from?.id);
      const buttons = groups.map(g => [Markup.button.callback(g.name, `GROUP_${g.id}`)]);
      buttons.push([Markup.button.callback('✅ Готово (Сохранить программу)', 'DONE')]);
      
      const msg = `Добавлено упражнений: ${state.exerciseIds!.length}\nВыберите следующую группу мышц:`;
      await ctx.editMessageText(msg, Markup.inlineKeyboard(buttons));
      return;
    }
  }
);
