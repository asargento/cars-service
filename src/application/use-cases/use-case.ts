import { type Logger } from '@aws-lambda-powertools/logger';
import { type CarsRepository } from '@domain/repositories';

export interface UseCaseOptions {
  logger: Logger;
  carsRepository: CarsRepository;
}

export abstract class UseCase<EntityType, ExecuteOptions = void> {
  protected logger: Logger;
  protected carsRepository: CarsRepository;

  constructor({ logger, carsRepository }: UseCaseOptions) {
    this.logger = logger;
    this.carsRepository = carsRepository;
  }

  abstract execute(options: ExecuteOptions): Promise<EntityType>;
}
