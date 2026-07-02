import { describe, it, expect, vi } from 'vitest';
import { generateDailyAnalysis } from '../src/modules/ai/ai.service.js';

describe('AI Service', () => {
  it('should format session and call fetch with correct data', async () => {
    process.env.OPENROUTER_API_KEY = 'test_key';
    
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'Good job!' } }] })
    });

    const mockSession = {
      template: { name: 'Full Body' },
      sets: [
        {
          exerciseId: 1,
          exercise: { name: 'Squats' },
          setNumber: 1,
          weight: 100000, // 100kg
          reps: 10,
          reachedFailure: true,
          failureRepNumber: 10,
          difficulty: 'Hard'
        }
      ]
    };

    const analysis = await generateDailyAnalysis(mockSession);
    expect(analysis).toBe('Good job!');
    expect(global.fetch).toHaveBeenCalled();
  });

  it('should return warning if API key is not set', async () => {
    process.env.OPENROUTER_API_KEY = 'YOUR_API_KEY';
    
    const analysis = await generateDailyAnalysis({});
    expect(analysis).toContain('Не настроен ключ OpenRouter');
  });
});
