import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
  Context,
} from 'aws-lambda';

import { type Logger } from '@aws-lambda-powertools/logger';
import { NotFoundError, Router } from '@aws-lambda-powertools/event-handler/http';
import { type HandlerResponse } from '@aws-lambda-powertools/event-handler/types';
import type { UseCaseFactory } from '@application/factories/use-case-factory';
import {
  type CarResponseProps,
  CarResponseSchema,
  CreateCarRequestSchema,
} from '@shared/schemas';
import { CarNotFoundError } from '@domain/errors';

export type { CarCreateRequestProps as CarCreateProps } from '@shared/schemas';

export type CreateApiHandlerOptions = {
  logger: Logger;
  useCaseFactory: UseCaseFactory;
};

export function createApiHandler({ logger, useCaseFactory }: CreateApiHandlerOptions) {
  const appRouter = new Router({ logger });

  appRouter.get(
    '/health',
    (): HandlerResponse =>
      new Response(JSON.stringify({ status: 'ok', path: '/health' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
  );

  appRouter.get('/cars', async (): Promise<HandlerResponse> => {
    logger.info('Listing cars');

    const carsList = await useCaseFactory.createListCarsUseCase().execute();
    const serializedCarsList = carsList.map((car) => car.toJSON());

    logger.info('Cars listed successfully', { carsCount: serializedCarsList.length });

    return new Response(JSON.stringify(serializedCarsList), { status: 200 });
  });

  appRouter.get(
    '/cars/:id',
    async ({ params: { id } }) => {
      logger.info('Getting car details', { carId: id });

      let serializedCarDetails: CarResponseProps | undefined;
      try {
        const carDetails = await useCaseFactory.createGetCarDetailsUseCase().execute({ carId: id });

        serializedCarDetails = carDetails.toJSON();
      } catch (error) {
        logger.error('Error retrieving car details', {
          carId: id,
          error: (error as Error).message,
        });
        if (error instanceof CarNotFoundError) {
          throw new NotFoundError(`Car with ID ${id} not found`);
        }
        throw error;
      }
      logger.info('Car details retrieved successfully', { car: serializedCarDetails });

      return serializedCarDetails;
    },
    {
      validation: {
        res: {
          body: CarResponseSchema,
        },
      },
    }
  );

  appRouter.post(
    '/cars',
    async ({ valid }): Promise<HandlerResponse> => {
      const body = valid.req.body;
      logger.info('Creating a new car', { body });

      const car = await useCaseFactory.createCreateCarUseCase().execute(body);

      logger.info('Car created successfully', { carId: car.id });

      return new Response(JSON.stringify({ message: 'Car created successfully' }), {
        headers: { location: `/cars/${car.id}` },
        status: 201,
      });
    },
    {
      validation: {
        req: {
          body: CreateCarRequestSchema,
        },
      },
    }
  );

  return async (
    event: APIGatewayProxyEventV2,
    context: Context
  ): Promise<APIGatewayProxyStructuredResultV2> => {
    logger.addContext(context);
    logger.logEventIfEnabled(event);
    return appRouter.resolve(event, context);
  };
}
