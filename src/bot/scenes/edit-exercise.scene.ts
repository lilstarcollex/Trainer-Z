import { Scenes, Markup } from 'telegraf';
import { MyContext } from '../context.js';
import { getExerciseById, updateExerciseName, updateExerciseMuscle, deleteCustomExercise } from '../../modules/exercises/exercise.service.js';
import { getAllMuscleGroups } from '../../modules/exercises/muscle-group.service.js';

export const editExerciseWizard = new Scenes.WizardScene<MyContext>(
  'EDIT_EXERCISE_WIZARD',
  async (ctx) => {
    const state = ctx.session.editExerciseState;
    if (!state || !state.exerciseId) return ctx.scene.leave();

    const exercise = await getExerciseById(state.exerciseId);
    if (!exercise) {
      await ctx.reply('Упражнение не найдено.');
      return ctx.scene.leave();
    }

    state.step = 'IDLE';

    let msg = `*Редактирование упражнения:*\n`;
    msg += `Название: ${exercise.name}\n`;
    const mgName = (exercise as any).muscleGroup?.name || 'Без группы';
    msg += `Целевая мышца: ${mgName}\n`;

    const buttons: any[] = [];
    buttons.push([Markup.button.callback('✏️ Изменить название', 'RENAME')]);
    buttons.push([Markup.button.callback('💪 Изменить целевую мышцу', 'RENAME_MUSCLE')]);
    buttons.push([Markup.button.callback('🗑 Удалить упражнение', 'DELETE_EX')]);
    buttons.push([Markup.button.callback('✅ Готово', 'DONE')]);

    await ctx.reply(msg, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons)
    });

    return ctx.wizard.next();
  },
  async (ctx) => {
    const state = ctx.session.editExerciseState;
    if (!state || !state.exerciseId) return ctx.scene.leave();

    if (state.step === 'RENAME') {
      if (!ctx.message || !('text' in ctx.message)) return;
      const text = ctx.message.text.trim();
      if (text === '/cancel') {
        state.step = 'IDLE';
        ctx.wizard.selectStep(0);
        return (ctx.wizard as any).steps[0](ctx);
      }
      if (text.length < 2) {
        await ctx.reply('Слишком короткое название. Попробуйте еще раз:');
        return;
      }
      await updateExerciseName(state.exerciseId, text);
      await ctx.reply('Название обновлено!');
      state.step = 'IDLE';
      ctx.wizard.selectStep(0);
      return (ctx.wizard as any).steps[0](ctx);
    }

    if (state.step === 'RENAME_MUSCLE') {
      if (!ctx.has('callback_query') || !ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;
      const data = ctx.callbackQuery.data;

      if (data === 'CANCEL_RENAME') {
        state.step = 'IDLE';
        ctx.wizard.selectStep(0);
        return (ctx.wizard as any).steps[0](ctx);
      }

      if (data.startsWith('GROUP_')) {
        const groupId = parseInt(data.replace('GROUP_', ''), 10);
        await updateExerciseMuscle(state.exerciseId, groupId);
        await ctx.answerCbQuery('Целевая мышца обновлена!');
        state.step = 'IDLE';
        ctx.wizard.selectStep(0);
        return (ctx.wizard as any).steps[0](ctx);
      }
      return;
    }

    // Default IDLE handling
    if (!ctx.has('callback_query') || !ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;
    const data = ctx.callbackQuery.data;

    if (data === 'DONE') {
      await ctx.reply('Редактирование завершено.');
      await ctx.answerCbQuery();
      return ctx.scene.leave();
    }

    if (data === 'DELETE_EX') {
      if (!ctx.from) return ctx.scene.leave();
      await deleteCustomExercise(ctx.from.id, state.exerciseId);
      await ctx.answerCbQuery('Упражнение удалено.');
      await ctx.reply('Упражнение удалено.');
      return ctx.scene.leave();
    }

    if (data === 'RENAME') {
      state.step = 'RENAME';
      await ctx.reply('Введите новое название для упражнения: (или /cancel для отмены)', Markup.inlineKeyboard([
        Markup.button.callback('Отмена', 'CANCEL_RENAME')
      ]));
      await ctx.answerCbQuery();
      return;
    }

    if (data === 'RENAME_MUSCLE') {
      state.step = 'RENAME_MUSCLE';
      const groups = await getAllMuscleGroups(ctx.from?.id);
      const buttons = groups.map(g => [Markup.button.callback(g.name, `GROUP_${g.id}`)]);
      buttons.push([Markup.button.callback('Отмена', 'CANCEL_RENAME')]);

      await ctx.reply('Выберите новую целевую мышцу:', Markup.inlineKeyboard(buttons));
      await ctx.answerCbQuery();
      return;
    }

    if (data === 'CANCEL_RENAME') {
      state.step = 'IDLE';
      ctx.wizard.selectStep(0);
      return (ctx.wizard as any).steps[0](ctx);
    }
  }
);
