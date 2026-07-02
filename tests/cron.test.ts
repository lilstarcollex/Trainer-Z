import { describe, it, expect, vi } from 'vitest';
import cron from 'node-cron';
import { startCronJobs } from '../src/cron.js';

vi.mock('node-cron', () => ({
  default: {
    schedule: vi.fn(),
  }
}));

describe('Cron Jobs', () => {
  it('should schedule job with Moscow timezone at 22:00', () => {
    startCronJobs({} as any);
    expect(cron.schedule).toHaveBeenCalledWith(
      '0 22 * * *',
      expect.any(Function),
      expect.objectContaining({ timezone: 'Europe/Moscow' })
    );
  });
});
