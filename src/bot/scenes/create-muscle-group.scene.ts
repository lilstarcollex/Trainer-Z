import { Scenes } from 'telegraf';
import { MyContext } from '../context.js';
import { createCustomMuscleGroup } from '../../modules/exercises/muscle-group.service.js';

export const createMuscleGroupWizard = new Scenes.WizardScene<MyContext>(
  'CREATE_MUSCLE_GROUP_WIZARD',
  async (ctx) => {
    await ctx.reply('Введите название новой группы мышц (например, "Икры"):');
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (!ctx.message || !('text' in ctx.message)) return;
    const name = ctx.message.text.trim();

    if (name.length < 2) {
      await ctx.reply('Название слишком короткое. Попробуйте еще раз:');
      return;
    }

    if (!ctx.from) return ctx.scene.leave();

    await createCustomMuscleGroup(ctx.from.id, name);
    await ctx.reply(`Группа мышц "${name}" успешно создана!`);
    return ctx.scene.leave();
  }
);
