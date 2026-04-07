import type { Logger } from '@aws-lambda-powertools/logger';
import type { CarsRepository } from '@domain/repositories';
import { ListCarsUseCase } from '../use-cases/list-cars-use-case';
import { GetCarDetailsUseCase } from '../use-cases/get-car-details-use-case';
import { CreateCarUseCase } from '../use-cases/create-car-use-case';

/**
 * Dependencies required to construct use cases. Injected at the composition root (e.g. Lambda handler).
 */
export type UseCaseFactoryDependencies = {
  logger: Logger;
  carsRepository: CarsRepository;
};

export interface UseCaseFactory {
  createGetCarDetailsUseCase(): GetCarDetailsUseCase;
  createListCarsUseCase: () => ListCarsUseCase;
  createCreateCarUseCase: () => CreateCarUseCase;
}

export function createUseCaseFactory(deps: UseCaseFactoryDependencies): UseCaseFactory {
  return {
    createListCarsUseCase: () => new ListCarsUseCase(deps),
    createGetCarDetailsUseCase: () => new GetCarDetailsUseCase(deps),
    createCreateCarUseCase: () => new CreateCarUseCase(deps),
  };
}
