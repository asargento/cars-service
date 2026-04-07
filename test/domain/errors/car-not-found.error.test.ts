import { CarNotFoundError } from '@domain/errors';
import { describe, expect, it } from 'vitest';

describe('CarNotFoundError', () => {
  it('carries the requested id and a stable name', () => {
    const err = new CarNotFoundError('car-123');

    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('CarNotFoundError');
    expect(err.carId).toBe('car-123');
    expect(err.message).toContain('car-123');
  });
});
