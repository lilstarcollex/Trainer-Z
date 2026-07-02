import { Markup } from 'telegraf';
import { MyContext } from '../context.js';
import { getUser } from '../../modules/users/user.service.js';
import { getAllTemplates, deleteCustomTemplate } from '../../modules/workouts/workout.service.js';
import { getAllExercises, deleteCustomExercise } from '../../modules/exercises/exercise.service.js';

export async function handleSettingsActions(ctx: MyContext) {
  if (!ctx.from || !ctx.has('callback_query') || !ctx.callbackQuery) return;
  if (!('data' in ctx.callbackQuery)) return;

  const user = await getUser(BigInt(ctx.from.id));
  if (!user) return;

  const data = ctx.callbackQuery.data;

  if (data === 'SETTINGS_TEMPLATES') {
    const templates = await getAllTemplates(user.id);

    if (templates.length === 0) {
      await ctx.reply('У вас пока нет программ.', Markup.inlineKeyboard([
        [Markup.button.callback('Создать новую программу', 'CREATE_TEMPLATE')]
      ]));
    } else {
      let msg = '*Программы тренировок:*\n\n';
      const buttons: any[] = [];
      templates.forEach(t => {
        msg += `- ${t.name}\n`;
        buttons.push([Markup.button.callback(`Редактировать: ${t.name}`, `EDIT_TEMPLATE_${t.id}`)]);
      });
      buttons.push([Markup.button.callback('Создать новую программу', 'CREATE_TEMPLATE')]);

      await ctx.reply(msg, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(buttons)
      });
    }
    await ctx.answerCbQuery();
  } else if (data === 'SETTINGS_EXERCISES') {
    const exercises = await getAllExercises(user.id);

    if (exercises.length === 0) {
      await ctx.reply('У вас пока нет упражнений.', Markup.inlineKeyboard([
        [Markup.button.callback('Создать упражнение', 'CREATE_EXERCISE')]
      ]));
    } else {
      let msg = '*Упражнения:*\n\n';
      const buttons: any[] = [];
      exercises.forEach(e => {
        const mgName = (e as any).muscleGroup?.name || 'Без группы';
        msg += `- ${e.name} (${mgName})\n`;
        buttons.push([Markup.button.callback(`Редактировать: ${e.name}`, `EDIT_EXERCISE_${e.id}`)]);
      });
      buttons.push([Markup.button.callback('Создать упражнение', 'CREATE_EXERCISE')]);

      await ctx.reply(msg, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(buttons)
      });
    }
    await ctx.answerCbQuery();
  } else if (data === 'SETTINGS_MUSCLE_GROUPS') {
    const { getAllMuscleGroups } = await import('../../modules/exercises/muscle-group.service.js');
    const groups = await getAllMuscleGroups(user.id);

    if (groups.length === 0) {
      await ctx.reply('У вас пока нет групп мышц.', Markup.inlineKeyboard([
        [Markup.button.callback('Создать группу мышц', 'CREATE_MUSCLE_GROUP')]
      ]));
    } else {
      let msg = '*Группы мышц:*\n\n';
      const buttons: any[] = [];
      groups.forEach(g => {
        msg += `- ${g.name}\n`;
        buttons.push([Markup.button.callback(`Редактировать: ${g.name}`, `EDIT_MUSCLE_GROUP_${g.id}`)]);
      });
      buttons.push([Markup.button.callback('Создать группу мышц', 'CREATE_MUSCLE_GROUP')]);

      await ctx.reply(msg, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(buttons)
      });
    }
    await ctx.answerCbQuery();
  } else if (data === 'CREATE_EXERCISE') {
    await ctx.answerCbQuery();
    await ctx.scene.enter('CREATE_EXERCISE_WIZARD');
  } else if (data === 'CREATE_TEMPLATE') {
    await ctx.answerCbQuery();
    await ctx.scene.enter('CREATE_TEMPLATE_WIZARD');
  } else if (data.startsWith('EDIT_TEMPLATE_')) {
    const templateId = parseInt(data.replace('EDIT_TEMPLATE_', ''), 10);
    ctx.session.editTemplateState = { templateId, step: 'IDLE' };
    await ctx.answerCbQuery();
    await ctx.scene.enter('EDIT_TEMPLATE_WIZARD');
  } else if (data.startsWith('EDIT_EXERCISE_')) {
    const exerciseId = parseInt(data.replace('EDIT_EXERCISE_', ''), 10);
    ctx.session.editExerciseState = { exerciseId, step: 'IDLE' };
    await ctx.answerCbQuery();
    await ctx.scene.enter('EDIT_EXERCISE_WIZARD');
  } else if (data === 'CREATE_MUSCLE_GROUP') {
    await ctx.answerCbQuery();
    await ctx.scene.enter('CREATE_MUSCLE_GROUP_WIZARD');
  } else if (data.startsWith('EDIT_MUSCLE_GROUP_')) {
    const muscleGroupId = parseInt(data.replace('EDIT_MUSCLE_GROUP_', ''), 10);
    ctx.session.editMuscleGroupState = { muscleGroupId, step: 'IDLE' };
    await ctx.answerCbQuery();
    await ctx.scene.enter('EDIT_MUSCLE_GROUP_WIZARD');
  } else if (data.startsWith('DELETE_TEMPLATE_')) {
    const templateId = parseInt(data.replace('DELETE_TEMPLATE_', ''), 10);
    try {
      await deleteCustomTemplate(user.id, templateId);
      await ctx.answerCbQuery('Программа удалена.');
      await ctx.reply('Программа успешно удалена.');
    } catch (e) {
      await ctx.answerCbQuery('Ошибка при удалении.', { show_alert: true });
    }
  } else if (data.startsWith('DELETE_EXERCISE_')) {
    const exerciseId = parseInt(data.replace('DELETE_EXERCISE_', ''), 10);
    try {
      await deleteCustomExercise(user.id, exerciseId);
      await ctx.answerCbQuery('Упражнение удалено.');
      await ctx.reply('Упражнение успешно удалено.');
    } catch (e) {
      await ctx.answerCbQuery('Ошибка при удалении.', { show_alert: true });
    }
  }
}
