import { Scenes, Markup } from 'telegraf';
import { MyContext } from '../context.js';
import { addSet, updateSet } from '../../modules/workouts/set.service.js';
import { setValidationSchema } from '../../common/validation.js';

export const logSetWizard = new Scenes.WizardScene<MyContext>(
  'LOG_SET_WIZARD',
  async (ctx) => {
    await ctx.reply('Введите вес в кг (например, 50 или 50.5). Для собственного веса введите 0.', Markup.inlineKeyboard([
      Markup.button.callback('Отмена', 'CANCEL_SET')
    ]));
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (ctx.has('callback_query') && ctx.callbackQuery) {
      if ('data' in ctx.callbackQuery && ctx.callbackQuery.data === 'CANCEL_SET') {
        await ctx.reply('Ввод отменён.');
        return ctx.scene.leave();
      }
    }
    
    if (!ctx.message || !('text' in ctx.message)) return;
    
    const text = ctx.message.text;
    if (text === '/cancel') {
      await ctx.reply('Ввод отменён.');
      return ctx.scene.leave();
    }

    const weightNum = parseFloat(text.replace(',', '.'));
    if (isNaN(weightNum) || weightNum < 0 || weightNum > 500) {
      await ctx.reply('Некорректный вес. Введите число от 0 до 500.');
      return;
    }

    ctx.session.logSetState = {
      ...ctx.session.logSetState,
      weight: weightNum, // keep in kg for validation
    } as any;

    await ctx.reply('Введите количество повторений (целое число):', Markup.inlineKeyboard([
      Markup.button.callback('Отмена', 'CANCEL_SET')
    ]));
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (ctx.has('callback_query') && ctx.callbackQuery) {
      if ('data' in ctx.callbackQuery && ctx.callbackQuery.data === 'CANCEL_SET') {
        await ctx.reply('Ввод отменён.');
        return ctx.scene.leave();
      }
    }

    if (!ctx.message || !('text' in ctx.message)) return;
    
    const text = ctx.message.text;
    if (text === '/cancel') {
      await ctx.reply('Ввод отменён.');
      return ctx.scene.leave();
    }

    const reps = parseInt(text, 10);
    if (isNaN(reps) || reps < 1 || reps > 100) {
      await ctx.reply('Некорректное количество. Введите целое число от 1 до 100.');
      return;
    }

    ctx.session.logSetState!.reps = reps;

    await ctx.reply('Дошли ли вы до отказа?', Markup.inlineKeyboard([
      [Markup.button.callback('Да', 'FAILURE_YES'), Markup.button.callback('Нет', 'FAILURE_NO')],
      [Markup.button.callback('Отмена', 'CANCEL_SET')]
    ]));
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (!ctx.has('callback_query') || !ctx.callbackQuery) return;
    if (!('data' in ctx.callbackQuery)) return;

    const data = ctx.callbackQuery.data;
    if (data === 'CANCEL_SET') {
      await ctx.reply('Ввод отменён.');
      return ctx.scene.leave();
    }

    if (data === 'FAILURE_NO') {
      ctx.session.logSetState!.reachedFailure = false;
      ctx.session.logSetState!.failureRepNumber = null;
      await ctx.reply('Оцените сложность:', Markup.inlineKeyboard([
        [Markup.button.callback('Легко', 'DIFF_EASY'), Markup.button.callback('Нормально', 'DIFF_NORMAL')],
        [Markup.button.callback('Тяжело', 'DIFF_HARD'), Markup.button.callback('Ад', 'DIFF_HELL')],
        [Markup.button.callback('Отмена', 'CANCEL_SET')]
      ]));
      // Skip the failure rep number step
      ctx.wizard.selectStep(5);
      return;
    } else if (data === 'FAILURE_YES') {
      ctx.session.logSetState!.reachedFailure = true;
      await ctx.reply(`На каком повторении случился отказ? (не больше ${ctx.session.logSetState!.reps}):`, Markup.inlineKeyboard([
        Markup.button.callback('Отмена', 'CANCEL_SET')
      ]));
      return ctx.wizard.next();
    }
  },
  async (ctx) => {
    if (ctx.has('callback_query') && ctx.callbackQuery) {
      if ('data' in ctx.callbackQuery && ctx.callbackQuery.data === 'CANCEL_SET') {
        await ctx.reply('Ввод отменён.');
        return ctx.scene.leave();
      }
    }

    if (!ctx.message || !('text' in ctx.message)) return;
    
    const text = ctx.message.text;
    if (text === '/cancel') {
      await ctx.reply('Ввод отменён.');
      return ctx.scene.leave();
    }

    const failureRep = parseInt(text, 10);
    const reps = ctx.session.logSetState!.reps!;
    if (isNaN(failureRep) || failureRep < 1 || failureRep > reps) {
      await ctx.reply(`Некорректное повторение. Оно должно быть от 1 до ${reps}.`);
      return;
    }

    ctx.session.logSetState!.failureRepNumber = failureRep;

    await ctx.reply('Оцените сложность:', Markup.inlineKeyboard([
      [Markup.button.callback('Легко', 'DIFF_EASY'), Markup.button.callback('Нормально', 'DIFF_NORMAL')],
      [Markup.button.callback('Тяжело', 'DIFF_HARD'), Markup.button.callback('Ад', 'DIFF_HELL')],
      [Markup.button.callback('Отмена', 'CANCEL_SET')]
    ]));
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (!ctx.has('callback_query') || !ctx.callbackQuery) return;
    if (!('data' in ctx.callbackQuery)) return;

    const data = ctx.callbackQuery.data;
    if (data === 'CANCEL_SET') {
      await ctx.reply('Ввод отменён.');
      return ctx.scene.leave();
    }

    const diffMap: Record<string, string> = {
      'DIFF_EASY': 'Легко',
      'DIFF_NORMAL': 'Нормально',
      'DIFF_HARD': 'Тяжело',
      'DIFF_HELL': 'Ад',
    };

    if (!diffMap[data]) return;

    ctx.session.logSetState!.difficulty = diffMap[data];

    await ctx.reply('Добавьте комментарий или нажмите "Пропустить":', Markup.inlineKeyboard([
      [Markup.button.callback('Пропустить', 'SKIP_COMMENT')],
      [Markup.button.callback('Отмена', 'CANCEL_SET')]
    ]));
    return ctx.wizard.next();
  },
  async (ctx) => {
    let comment: string | null = null;

    if (ctx.has('callback_query') && ctx.callbackQuery) {
      if ('data' in ctx.callbackQuery && ctx.callbackQuery.data === 'CANCEL_SET') {
        await ctx.reply('Ввод отменён.');
        return ctx.scene.leave();
      }
      if ('data' in ctx.callbackQuery && ctx.callbackQuery.data === 'SKIP_COMMENT') {
        comment = null;
      }
    } else if (ctx.message && 'text' in ctx.message) {
      if (ctx.message.text === '/cancel') {
        await ctx.reply('Ввод отменён.');
        return ctx.scene.leave();
      }
      comment = ctx.message.text;
    } else {
      return;
    }

    ctx.session.logSetState!.comment = comment;

    // Validate and save
    const state = ctx.session.logSetState!;
    const validationResult = setValidationSchema.safeParse(state);

    if (!validationResult.success) {
      await ctx.reply('Ошибка валидации данных. Начните заново.');
      console.error(validationResult.error);
      return ctx.scene.leave();
    }

    try {
      const weightInGrams = Math.round(state.weight! * 1000);
      if ((state as any).isEdit && (state as any).setId) {
        await updateSet((state as any).setId, {
          weight: weightInGrams,
          reps: state.reps!,
          reachedFailure: state.reachedFailure!,
          failureRepNumber: state.failureRepNumber || null,
          difficulty: state.difficulty!,
          comment: state.comment || null
        });
        await ctx.reply('Подход успешно обновлён! Отправьте /workout чтобы вернуться к тренировке.');
      } else {
        await addSet(
          ctx.session.workoutSessionId!,
          state.exerciseId,
          weightInGrams,
          state.reps!,
          state.reachedFailure!,
          state.failureRepNumber || null,
          state.difficulty!,
          state.comment || null
        );
        await ctx.reply('Подход успешно сохранён! Отправьте /workout чтобы вернуться к тренировке.');
      }
    } catch (e) {
      console.error(e);
      await ctx.reply('Произошла ошибка при сохранении.');
    }

    return ctx.scene.leave();
  }
);
