import { Scenes, Markup } from 'telegraf';
import { MyContext } from '../context.js';
import { getMuscleGroupById, updateMuscleGroupName, deleteCustomMuscleGroup } from '../../modules/exercises/muscle-group.service.js';

export const editMuscleGroupWizard = new Scenes.WizardScene<MyContext>(
  'EDIT_MUSCLE_GROUP_WIZARD',
  async (ctx) => {
    const state = ctx.session.editMuscleGroupState;
    if (!state || !state.muscleGroupId) return ctx.scene.leave();

    const group = await getMuscleGroupById(state.muscleGroupId);
    if (!group) {
      await ctx.reply('Группа не найдена.');
      return ctx.scene.leave();
    }

    state.step = 'IDLE';

    let msg = `*Редактирование группы мышц:*\nНазвание: ${group.name}\n`;

    const buttons: any[] = [];
    buttons.push([Markup.button.callback('✏️ Изменить название', 'RENAME')]);
    buttons.push([Markup.button.callback('🗑 Удалить группу', 'DELETE_GROUP')]);
    buttons.push([Markup.button.callback('✅ Готово', 'DONE')]);

    await ctx.reply(msg, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons)
    });

    return ctx.wizard.next();
  },
  async (ctx) => {
    const state = ctx.session.editMuscleGroupState;
    if (!state || !state.muscleGroupId) return ctx.scene.leave();

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
      await updateMuscleGroupName(state.muscleGroupId, text);
      await ctx.reply('Название обновлено!');
      state.step = 'IDLE';
      ctx.wizard.selectStep(0);
      return ctx.wizard.steps[0](ctx);
    }

    // Default IDLE handling
    if (!ctx.has('callback_query') || !ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;
    const data = ctx.callbackQuery.data;

    if (data === 'DONE') {
      await ctx.reply('Редактирование завершено.');
      await ctx.answerCbQuery();
      return ctx.scene.leave();
    }

    if (data === 'DELETE_GROUP') {
      if (!ctx.from) return ctx.scene.leave();
      try {
        await deleteCustomMuscleGroup(ctx.from.id, state.muscleGroupId);
        await ctx.answerCbQuery('Группа мышц удалена.');
        await ctx.reply('Группа мышц успешно удалена.');
      } catch (e: any) {
        await ctx.answerCbQuery(e.message || 'Ошибка удаления.', { show_alert: true });
      }
      return ctx.scene.leave();
    }

    if (data === 'RENAME') {
      state.step = 'RENAME';
      await ctx.reply('Введите новое название для группы мышц: (или /cancel для отмены)', Markup.inlineKeyboard([
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
  }
);
