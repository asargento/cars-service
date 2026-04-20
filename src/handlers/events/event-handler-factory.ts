import type { Context } from 'aws-lambda';

import { type Logger } from '@aws-lambda-powertools/logger';
import type { UseCaseFactory } from '@application/factories/use-case-factory';
import { CarSubmittedDetailSchema } from '../schemas';
import { EventBridgeEnvelope } from '@aws-lambda-powertools/parser/envelopes/eventbridge';
import type { EventBridgeEvent } from '@aws-lambda-powertools/parser/types';

export type CreateOnCarSubmittedHandlerOptions = {
  logger: Logger;
  useCaseFactory: UseCaseFactory;
};

/**
 * Lambda handler factory for EventBridge rule `detail-type: CarSubmitted`.
 * Validates `event.detail` and runs the create-car use case.
 */
export function createOnCarSubmittedHandler({
  logger,
  useCaseFactory,
}: CreateOnCarSubmittedHandlerOptions) {
  return async (event: EventBridgeEvent, context: Context): Promise<void> => {
    logger.addContext(context);

    const parsedEvent = EventBridgeEnvelope.safeParse(event, CarSubmittedDetailSchema);
    if (!parsedEvent.success) {
      logger.error('Invalid CarSubmitted event detail', {
        issues: parsedEvent.error,
      });
      return;
    }

    logger.info('Processing CarSubmitted', { detail: parsedEvent.data });
    const car = await useCaseFactory.createCreateCarUseCase().execute(parsedEvent.data);
    logger.info('Car created from CarSubmitted event', { carId: car.id });
  };
}
