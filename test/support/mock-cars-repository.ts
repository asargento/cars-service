import type { CarsRepository } from '@domain/repositories';
import { vi, type Mock } from 'vitest';

export type MockedCarsRepository = {
  listCars: Mock<CarsRepository['listCars']>;
  getCarById: Mock<CarsRepository['getCarById']>;
  storeCar: Mock<CarsRepository['storeCar']>;
};

export function createMockCarsRepository(): MockedCarsRepository {
  return {
    listCars: vi.fn(),
    getCarById: vi.fn(),
    storeCar: vi.fn(),
  };
}
