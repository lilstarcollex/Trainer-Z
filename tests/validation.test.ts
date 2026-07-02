import { describe, it, expect } from 'vitest';
import { setValidationSchema } from '../src/common/validation.js';

describe('Set Validation', () => {
  it('should pass valid data without failure', () => {
    const data = {
      weight: 50,
      reps: 10,
      reachedFailure: false,
      failureRepNumber: null,
      difficulty: 'Нормально',
      comment: null,
    };
    const result = setValidationSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should pass valid data with failure', () => {
    const data = {
      weight: 50,
      reps: 10,
      reachedFailure: true,
      failureRepNumber: 10,
      difficulty: 'Тяжело',
      comment: 'Hard set',
    };
    const result = setValidationSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should fail if failureRepNumber > reps', () => {
    const data = {
      weight: 50,
      reps: 10,
      reachedFailure: true,
      failureRepNumber: 11,
      difficulty: 'Ад',
      comment: null,
    };
    const result = setValidationSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('should fail if reachedFailure is false but failureRepNumber is provided', () => {
    const data = {
      weight: 50,
      reps: 10,
      reachedFailure: false,
      failureRepNumber: 5,
      difficulty: 'Легко',
      comment: null,
    };
    const result = setValidationSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('should fail if weight is out of bounds', () => {
    const data = {
      weight: -1,
      reps: 10,
      reachedFailure: false,
      failureRepNumber: null,
      difficulty: 'Легко',
      comment: null,
    };
    const result = setValidationSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('should fail if reps is out of bounds', () => {
    const data1 = {
      weight: 50,
      reps: 0,
      reachedFailure: false,
      failureRepNumber: null,
      difficulty: 'Легко',
      comment: null,
    };
    const data2 = {
      ...data1,
      reps: 101,
    };
    expect(setValidationSchema.safeParse(data1).success).toBe(false);
    expect(setValidationSchema.safeParse(data2).success).toBe(false);
  });

  it('should fail if reachedFailure is true but failureRepNumber is missing', () => {
    const data = {
      weight: 50,
      reps: 10,
      reachedFailure: true,
      failureRepNumber: null,
      difficulty: 'Тяжело',
      comment: null,
    };
    expect(setValidationSchema.safeParse(data).success).toBe(false);
  });
});
