import { CreateCarUseCase } from '@application/use-cases/create-car-use-case';
import { GetCarDetailsUseCase } from '@application/use-cases/get-car-details-use-case';
import { ListCarsUseCase } from '@application/use-cases/list-cars-use-case';
import { Car } from '@domain/entities';
import { CarNotFoundError } from '@domain/errors';
import { describe, expect, it } from 'vitest';
import { act, arrange, assertOutcome } from '../../support/scenario-helpers';
import { createTestLogger } from '../../support/mock-api-deps';
import { createMockCarsRepository } from '../../support/mock-cars-repository';

describe('Feature: List cars use case', () => {
  describe('Scenario: Catalog read', () => {
    it('Given a repository that returns cars, when the use case runs, then it returns that list and calls listCars once', async () => {
      const logger = arrange(() => createTestLogger());
      const carsRepository = arrange(() => createMockCarsRepository());
      const carA = Car.create({ make: 'Acme', model: 'A1', year: 2022 });
      const carB = Car.create({ make: 'Beta', model: 'B2', year: 2023 });
      carsRepository.listCars.mockResolvedValue([carA, carB]);

      const useCase = arrange(() => new ListCarsUseCase({ logger, carsRepository }));

      const result = await act(() => useCase.execute());

      assertOutcome(() => {
        expect(result).toEqual([carA, carB]);
        expect(carsRepository.listCars).toHaveBeenCalledOnce();
      });
    });

    it('Given an empty repository, when the use case runs, then it returns an empty array', async () => {
      const logger = arrange(() => createTestLogger());
      const carsRepository = arrange(() => createMockCarsRepository());
      carsRepository.listCars.mockResolvedValue([]);

      const useCase = arrange(() => new ListCarsUseCase({ logger, carsRepository }));

      const result = await act(() => useCase.execute());

      assertOutcome(() => {
        expect(result).toEqual([]);
      });
    });
  });
});

describe('Feature: Get car details use case', () => {
  describe('Scenario: Load by id', () => {
    it('Given a repository that has a car for the id, when the use case runs, then it returns that car', async () => {
      const logger = arrange(() => createTestLogger());
      const carsRepository = arrange(() => createMockCarsRepository());
      const car = Car.create({ make: 'Solo', model: 'One', year: 2021 });
      carsRepository.getCarById.mockResolvedValue(car);

      const useCase = arrange(() => new GetCarDetailsUseCase({ logger, carsRepository }));
      const carId = car.id;

      const result = await act(() => useCase.execute({ carId }));

      assertOutcome(() => {
        expect(result).toBe(car);
        expect(carsRepository.getCarById).toHaveBeenCalledOnce();
        expect(carsRepository.getCarById).toHaveBeenCalledWith(carId);
      });
    });

    it('Given the repository throws CarNotFoundError, when the use case runs, then the error propagates', async () => {
      const logger = arrange(() => createTestLogger());
      const carsRepository = arrange(() => createMockCarsRepository());
      carsRepository.getCarById.mockRejectedValue(new CarNotFoundError('missing-id'));

      const useCase = arrange(() => new GetCarDetailsUseCase({ logger, carsRepository }));

      await expect(act(() => useCase.execute({ carId: 'missing-id' }))).rejects.toThrow(
        CarNotFoundError
      );
      assertOutcome(() => {
        expect(carsRepository.getCarById).toHaveBeenCalledWith('missing-id');
      });
    });
  });
});

describe('Feature: Create car use case', () => {
  describe('Scenario: Persist new car', () => {
    it('Given valid car properties, when the use case runs, then it persists a new car and returns it', async () => {
      const logger = arrange(() => createTestLogger());
      const carsRepository = arrange(() => createMockCarsRepository());
      carsRepository.storeCar.mockResolvedValue(undefined);

      const useCase = arrange(() => new CreateCarUseCase({ logger, carsRepository }));
      const props = { make: 'Nova', model: 'X', year: 2025 };

      const result = await act(() => useCase.execute(props));

      assertOutcome(() => {
        expect(result.make).toBe('Nova');
        expect(result.model).toBe('X');
        expect(result.year).toBe(2025);
        expect(carsRepository.storeCar).toHaveBeenCalledOnce();
        const saved = carsRepository.storeCar.mock.calls[0][0] as Car;
        expect(saved).toBe(result);
        expect(saved.make).toBe('Nova');
      });
    });
  });
});
