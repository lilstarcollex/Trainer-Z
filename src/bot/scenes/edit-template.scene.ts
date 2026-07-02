import { Scenes, Markup } from 'telegraf';
import { MyContext } from '../context.js';
import { getTemplateById, updateTemplateName, removeExerciseFromTemplate, addExerciseToTemplate, deleteCustomTemplate } from '../../modules/workouts/workout.service.js';
import { getAllExercises } from '../../modules/exercises/exercise.service.js';
import { getAllMuscleGroups } from '../../modules/exercises/muscle-group.service.js';

export const editTemplateWizard = new Scenes.WizardScene<MyContext>(
  'EDIT_TEMPLATE_WIZARD',
  async (ctx) => {
    const state = ctx.session.editTemplateState;
    if (!state || !state.templateId) return ctx.scene.leave();

    const template = await getTemplateById(state.templateId);
    if (!template) {
      await ctx.reply('Программа не найдена.');
      return ctx.scene.leave();
    }

    state.step = 'IDLE';

    let msg = `*Редактирование: ${template.name}*\n\nСостав программы:\n`;
    const buttons: any[] = [];
    
    template.exercises.forEach(exLink => {
      msg += `- ${exLink.exercise.name}\n`;
      buttons.push([Markup.button.callback(`Удалить: ${exLink.exercise.name}`, `REM_EX_${exLink.exerciseId}`)]);
    });

    if (template.exercises.length === 0) {
      msg += `_Пусто_\n`;
    }

    buttons.push([Markup.button.callback('➕ Добавить упражнение', 'ADD_EX')]);
    buttons.push([Markup.button.callback('✏️ Изменить название', 'RENAME')]);
    buttons.push([Markup.button.callback('🗑 Удалить программу', 'DELETE_TMPL')]);
    buttons.push([Markup.button.callback('✅ Готово', 'DONE')]);

    await ctx.reply(msg, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons)
    });

    return ctx.wizard.next();
  },
  async (ctx) => {
    const state = ctx.session.editTemplateState;
    if (!state || !state.templateId) return ctx.scene.leave();

    if (state.step === 'RENAME') {
      if (!ctx.message || !('text' in ctx.message)) return;
      const text = ctx.message.text.trim();
      if (text === '/cancel') {
        state.step = 'IDLE';
        ctx.wizard.selectStep(0);
        return ctx.wizard.steps[0](ctx);
      }
      if (text.length < 2) {
        await ctx.reply('Слишком короткое название. Попробуйте еще раз:');
        return;
      }
      await updateTemplateName(state.templateId, text);
      await ctx.reply('Название обновлено!');
      state.step = 'IDLE';
      ctx.wizard.selectStep(0);
      return ctx.wizard.steps[0](ctx);
    }

    if (!ctx.has('callback_query') || !ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;
    const data = ctx.callbackQuery.data;

    if (state.step === 'ADD_EXERCISE') {
      if (data === 'CANCEL') {
        state.step = 'IDLE';
        ctx.wizard.selectStep(0);
        return ctx.wizard.steps[0](ctx);
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
        buttons.push([Markup.button.callback('Отмена', 'CANCEL')]);
        await ctx.editMessageText('Выберите группу мышц:', Markup.inlineKeyboard(buttons));
        return;
      }

      if (data.startsWith('PICK_EX_')) {
        const exId = parseInt(data.replace('PICK_EX_', ''), 10);
        await addExerciseToTemplate(state.templateId, exId);
        await ctx.answerCbQuery('Упражнение добавлено!');
        state.step = 'IDLE';
        ctx.wizard.selectStep(0);
        return ctx.wizard.steps[0](ctx);
      }
      return;
    }

    // Default IDLE handling
    if (data === 'DONE') {
      await ctx.reply('Редактирование завершено.');
      await ctx.answerCbQuery();
      return ctx.scene.leave();
    }

    if (data === 'DELETE_TMPL') {
      if (!ctx.from) return ctx.scene.leave();
      await deleteCustomTemplate(ctx.from.id, state.templateId);
      await ctx.answerCbQuery('Программа удалена.');
      await ctx.reply('Программа удалена.');
      return ctx.scene.leave();
    }

    if (data === 'RENAME') {
      state.step = 'RENAME';
      await ctx.reply('Введите новое название для программы: (или /cancel для отмены)', Markup.inlineKeyboard([
        Markup.button.callback('Отмена', 'CANCEL_RENAME')
      ]));
      await ctx.answerCbQuery();
      return;
    }

    if (data === 'CANCEL_RENAME') {
      state.step = 'IDLE';
      ctx.wizard.selectStep(0);
      return ctx.wizard.steps[0](ctx);
    }

    if (data === 'ADD_EX') {
      state.step = 'ADD_EXERCISE';
      if (!ctx.from) return ctx.scene.leave();
      const groups = await getAllMuscleGroups(ctx.from.id);
      const buttons = groups.map(g => [Markup.button.callback(g.name, `GROUP_${g.id}`)]);
      buttons.push([Markup.button.callback('Отмена', 'CANCEL')]);

      await ctx.reply('Выберите группу мышц:', Markup.inlineKeyboard(buttons));
      await ctx.answerCbQuery();
      return;
    }

    if (data.startsWith('REM_EX_')) {
      const exId = parseInt(data.replace('REM_EX_', ''), 10);
      await removeExerciseFromTemplate(state.templateId, exId);
      await ctx.answerCbQuery('Упражнение удалено!');
      
      // Refresh
      ctx.wizard.selectStep(0);
      return ctx.wizard.steps[0](ctx);
    }
  }
);
