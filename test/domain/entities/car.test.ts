import { Car } from '@domain/entities';
import { describe, expect, it } from 'vitest';

describe('Car entity', () => {
  it('toJSON exposes only the public wire shape (no duplicate props bag)', () => {
    const car = Car.create({ make: 'Acme', model: 'Road', year: 2021 });
    const json = car.toJSON();

    expect(json).toEqual({
      id: car.id,
      make: 'Acme',
      model: 'Road',
      year: 2021,
      createdAt: car.createdAt.toISOString(),
      updatedAt: car.updatedAt.toISOString(),
    });
    expect(json).not.toHaveProperty('props');
  });

  it('JSON.stringify uses toJSON so serialization matches the wire shape', () => {
    const car = Car.create({ make: 'Beta', model: 'Z', year: 2022 });
    const roundTrip = JSON.parse(JSON.stringify(car)) as Record<string, unknown>;

    expect(roundTrip).not.toHaveProperty('props');
    expect(roundTrip.make).toBe('Beta');
    expect(roundTrip.model).toBe('Z');
    expect(roundTrip.year).toBe(2022);
    expect(typeof roundTrip.createdAt).toBe('string');
    expect(typeof roundTrip.updatedAt).toBe('string');
  });
});
