import { prisma } from '../../prisma/client.js';

export async function getCompletedSessionsForLast24Hours() {
  const yesterday = new Date();
  yesterday.setHours(yesterday.getHours() - 24);

  return prisma.workoutSession.findMany({
    where: {
      status: 'COMPLETED',
      updatedAt: { gte: yesterday }
    },
    include: {
      user: true,
      template: true,
      sets: {
        include: { exercise: true },
        orderBy: [{ exerciseId: 'asc' }, { setNumber: 'asc' }]
      }
    }
  });
}

export async function generateDailyAnalysis(session: any): Promise<string> {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  if (!openRouterKey || openRouterKey === 'YOUR_API_KEY') {
    return '⚠️ Не настроен ключ OpenRouter для анализа.';
  }

  // Format session data for prompt
  let dataStr = `Тренировка: ${session.template.name}\n`;
  let currentExId = -1;
  for (const set of session.sets) {
    if (set.exerciseId !== currentExId) {
      dataStr += `\nУпражнение: ${set.exercise.name}\n`;
      currentExId = set.exerciseId;
    }
    dataStr += `- Подход ${set.setNumber}: ${set.weight / 1000} кг x ${set.reps} `;
    if (set.reachedFailure) dataStr += `(Отказ на ${set.failureRepNumber}) `;
    dataStr += `[Сложность: ${set.difficulty}]\n`;
  }

  const prompt = `Ты строгий, но мотивирующий AI-тренер. Пользователь завершил тренировку сегодня:\n\n${dataStr}\n\nПроанализируй объемы, интенсивность, количество отказов. Напиши короткий (до 150 слов) мотивирующий фидбек и 1-2 совета по восстановлению.`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-3.5-turbo', // Or any other suitable model from OpenRouter like google/gemini-pro
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      console.error('OpenRouter Error:', await response.text());
      return '⚠️ Произошла ошибка при генерации AI-анализа (API Error).';
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('AI Analysis request failed:', error);
    return '⚠️ Произошла ошибка при генерации AI-анализа (Network Error).';
  }
}
