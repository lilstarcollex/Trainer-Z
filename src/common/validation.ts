import { z } from 'zod';

export const setValidationSchema = z.object({
  weight: z.number().min(0).max(500),
  reps: z.number().int().min(1).max(100),
  reachedFailure: z.boolean(),
  failureRepNumber: z.number().int().min(1).max(100).nullable(),
  difficulty: z.enum(['Легко', 'Нормально', 'Тяжело', 'Ад']),
  comment: z.string().max(255).nullable(),
}).refine(data => {
  if (data.reachedFailure && data.failureRepNumber === null) {
    return false;
  }
  if (!data.reachedFailure && data.failureRepNumber !== null) {
    return false;
  }
  if (data.reachedFailure && data.failureRepNumber !== null && data.failureRepNumber > data.reps) {
    return false;
  }
  return true;
}, {
  message: "Некорректно указан отказ или номер повторения отказа.",
  path: ['failureRepNumber']
});

export type SetValidationType = z.infer<typeof setValidationSchema>;
