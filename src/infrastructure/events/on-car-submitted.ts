import { Logger } from '@aws-lambda-powertools/logger';
import { createUseCaseFactory } from '@application/factories/use-case-factory';
import { CarRepositoryMemory } from '@infrastructure/repositories/car-repository-memory';
import { createOnCarSubmittedHandler } from './event-handler-factory';

const carsRepository = new CarRepositoryMemory();
const logger = new Logger({ serviceName: 'cars-service' });
const useCaseFactory = createUseCaseFactory({ logger, carsRepository });

export const handler = createOnCarSubmittedHandler({
  logger,
  useCaseFactory,
});
