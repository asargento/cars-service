import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { Car } from '@domain/entities';
import { CarNotFoundError } from '@domain/errors';
import { createApiHandler } from '@/handlers/api-handler-factory';
import { CarResponseSchema } from '@/handlers/schemas';
import {
  act,
  arrange,
  assertOutcome,
  createHttpApiV2Event,
  createLambdaTestContext,
} from '../support/scenario-helpers';
import { createMockedUseCaseFactory, createTestLogger } from '../support/mock-api-deps';

function parseJsonBody(res: APIGatewayProxyStructuredResultV2): unknown {
  if (typeof res.body !== 'string') {
    throw new Error('Expected string body');
  }
  return JSON.parse(res.body);
}

describe('Feature: Cars service HTTP API', () => {
  describe('Scenario: Liveness / readiness', () => {
    it('Given a GET request to /health, when the Lambda handler processes it, then the client receives 200 and a healthy status', async () => {
      const logger = arrange(() => createTestLogger());
      const { factory } = arrange(() => createMockedUseCaseFactory());
      const handler = arrange(() => createApiHandler({ logger, useCaseFactory: factory }));
      const context = arrange(() => createLambdaTestContext());
      const event = arrange(() => createHttpApiV2Event({ method: 'GET', path: '/health' }));

      const response = await act(() => handler(event, context));

      assertOutcome(() => {
        expect(response.statusCode).toBe(200);
        const body = parseJsonBody(response) as { status: string; path: string };
        expect(body.status).toBe('ok');
        expect(body.path).toBe('/health');
      });
    });
  });

  describe('Scenario: Unknown routes', () => {
    it('Given a GET request to a path with no matching route, when the handler runs, then the client receives 404', async () => {
      const logger = arrange(() => createTestLogger());
      const { factory } = arrange(() => createMockedUseCaseFactory());
      const handler = arrange(() => createApiHandler({ logger, useCaseFactory: factory }));
      const context = arrange(() => createLambdaTestContext());
      const event = arrange(() =>
        createHttpApiV2Event({ method: 'GET', path: '/no-such-resource' })
      );

      const response = await act(() => handler(event, context));

      assertOutcome(() => {
        expect(response.statusCode).toBe(404);
      });
    });
  });

  describe('Scenario: Listing cars', () => {
    it('Given the catalog API, when the client GETs /cars, then the response is 200 with the list returned by the list use case', async () => {
      const logger = arrange(() => createTestLogger());
      const { factory, listExecute } = arrange(() => createMockedUseCaseFactory());
      const sampleCar = Car.create({ make: 'Test', model: 'GT', year: 2023 });
      listExecute.mockResolvedValue([sampleCar]);

      const handler = arrange(() => createApiHandler({ logger, useCaseFactory: factory }));
      const context = arrange(() => createLambdaTestContext());
      const event = arrange(() => createHttpApiV2Event({ method: 'GET', path: '/cars' }));

      const response = await act(() => handler(event, context));

      assertOutcome(() => {
        expect(response.statusCode).toBe(200);
        const body = z.array(CarResponseSchema).parse(parseJsonBody(response));
        expect(body).toHaveLength(1);
        const row = body[0];
        expect(row).toMatchObject({
          make: 'Test',
          model: 'GT',
          year: 2023,
        });
        expect(row).not.toHaveProperty('props');
        expect(logger.info).toHaveBeenCalledWith('Listing cars');
        expect(logger.info).toHaveBeenCalledWith(
          'Cars listed successfully',
          expect.objectContaining({ carsCount: 1 })
        );
        expect(listExecute).toHaveBeenCalledOnce();
      });
    });
  });

  describe('Scenario: Creating a car', () => {
    it('Given a valid JSON body with make, model, and year, when the client POSTs to /cars, then the response is 201 and the create use case is invoked', async () => {
      const logger = arrange(() => createTestLogger());
      const { factory, createExecute } = arrange(() => createMockedUseCaseFactory());
      const created = Car.create({ make: 'TestMake', model: 'TestModel', year: 2020 });
      createExecute.mockResolvedValue(created);

      const handler = arrange(() => createApiHandler({ logger, useCaseFactory: factory }));
      const context = arrange(() => createLambdaTestContext());
      const event = arrange(() =>
        createHttpApiV2Event({
          method: 'POST',
          path: '/cars',
          body: { make: 'TestMake', model: 'TestModel', year: 2020 },
        })
      );

      const response = await act(() => handler(event, context));

      assertOutcome(() => {
        expect(response.statusCode).toBe(201);
        expect(response.headers).toHaveProperty('location', `/cars/${created.id}`);
        const body = parseJsonBody(response) as { message: string };
        expect(body.message).toBe('Car created successfully');
        expect(createExecute).toHaveBeenCalledOnce();
        expect(createExecute).toHaveBeenCalledWith({
          make: 'TestMake',
          model: 'TestModel',
          year: 2020,
        });
      });
    });

    it('Given a body that fails schema validation, when the client POSTs to /cars, then the response is 422 and the create use case is not run', async () => {
      const logger = arrange(() => createTestLogger());
      const { factory, createExecute } = arrange(() => createMockedUseCaseFactory());
      const handler = arrange(() => createApiHandler({ logger, useCaseFactory: factory }));
      const context = arrange(() => createLambdaTestContext());
      const event = arrange(() =>
        createHttpApiV2Event({
          method: 'POST',
          path: '/cars',
          body: { make: 'X', model: 'Y', year: 1700 },
        })
      );

      const response = await act(() => handler(event, context));

      assertOutcome(() => {
        expect(response.statusCode).toBe(422);
        expect(createExecute).not.toHaveBeenCalled();
      });
    });
  });

  describe('Scenario: Catalog changes after creation', () => {
    it('Given list returns an extra car after a successful create, when the client POSTs then GETs /cars, then the second list reflects the new car', async () => {
      const logger = arrange(() => createTestLogger());
      const { factory, listExecute, createExecute } = arrange(() => createMockedUseCaseFactory());
      const newCar = Car.create({ make: 'Acme', model: `Roadster-${randomUUID()}`, year: 2024 });
      createExecute.mockResolvedValue(newCar);
      listExecute.mockResolvedValueOnce([]).mockResolvedValueOnce([newCar]);

      const handler = arrange(() => createApiHandler({ logger, useCaseFactory: factory }));
      const context = arrange(() => createLambdaTestContext());

      const listBefore = await act(() =>
        handler(createHttpApiV2Event({ method: 'GET', path: '/cars' }), context)
      );
      const countBefore = (parseJsonBody(listBefore) as unknown[]).length;

      await act(() =>
        handler(
          createHttpApiV2Event({
            method: 'POST',
            path: '/cars',
            body: { make: 'Acme', model: newCar.model, year: 2024 },
          }),
          context
        )
      );

      const listAfter = await act(() =>
        handler(createHttpApiV2Event({ method: 'GET', path: '/cars' }), context)
      );

      assertOutcome(() => {
        expect(listAfter.statusCode).toBe(200);
        const listAfterParsed = z.array(CarResponseSchema).parse(parseJsonBody(listAfter));
        expect(listAfterParsed.length).toBe(countBefore + 1);
        expect(listAfterParsed.some((c) => c.id === newCar.id)).toBe(true);
        expect(createExecute).toHaveBeenCalledOnce();
        expect(listExecute).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Scenario: Car details by id', () => {
    it('Given the get-details use case returns a car, when the client GETs /cars/:id, then the response is 200 with a CarResponse-shaped body', async () => {
      const logger = arrange(() => createTestLogger());
      const { factory, getDetailsExecute } = arrange(() => createMockedUseCaseFactory());
      const car = Car.create({ make: 'Detail', model: 'Line', year: 2022 });
      getDetailsExecute.mockResolvedValue(car);

      const handler = arrange(() => createApiHandler({ logger, useCaseFactory: factory }));
      const context = arrange(() => createLambdaTestContext());
      const event = arrange(() => createHttpApiV2Event({ method: 'GET', path: `/cars/${car.id}` }));

      const response = await act(() => handler(event, context));

      assertOutcome(() => {
        expect(response.statusCode).toBe(200);
        const body = CarResponseSchema.parse(parseJsonBody(response));
        expect(body).toEqual(car.toJSON());
        expect(body).not.toHaveProperty('props');
        expect(logger.info).toHaveBeenCalledWith('Getting car details', { carId: car.id });
        expect(logger.info).toHaveBeenCalledWith(
          'Car details retrieved successfully',
          expect.objectContaining({ car: car.toJSON() })
        );
        expect(getDetailsExecute).toHaveBeenCalledOnce();
        expect(getDetailsExecute).toHaveBeenCalledWith({ carId: car.id });
      });
    });

    it('Given the get-details use case throws CarNotFoundError, when the client GETs /cars/:id, then the handler responds with 404', async () => {
      const logger = arrange(() => createTestLogger());
      const { factory, getDetailsExecute } = arrange(() => createMockedUseCaseFactory());
      const unknownId = randomUUID();
      getDetailsExecute.mockRejectedValue(new CarNotFoundError(unknownId));

      const handler = arrange(() => createApiHandler({ logger, useCaseFactory: factory }));
      const context = arrange(() => createLambdaTestContext());
      const event = arrange(() =>
        createHttpApiV2Event({ method: 'GET', path: `/cars/${unknownId}` })
      );

      const response = await act(() => handler(event, context));

      assertOutcome(() => {
        expect(response.statusCode).toBe(404);
        expect(getDetailsExecute).toHaveBeenCalledWith({ carId: unknownId });
        expect(logger.error).toHaveBeenCalledWith(
          'Error retrieving car details',
          expect.objectContaining({ carId: unknownId })
        );
      });
    });

    it('Given the get-details use case throws an unexpected error, when the client GETs /cars/:id, then the handler responds with a server error', async () => {
      const logger = arrange(() => createTestLogger());
      const { factory, getDetailsExecute } = arrange(() => createMockedUseCaseFactory());
      getDetailsExecute.mockRejectedValue(new Error('Database unavailable'));

      const handler = arrange(() => createApiHandler({ logger, useCaseFactory: factory }));
      const context = arrange(() => createLambdaTestContext());
      const unknownId = randomUUID();
      const event = arrange(() =>
        createHttpApiV2Event({ method: 'GET', path: `/cars/${unknownId}` })
      );

      const response = await act(() => handler(event, context));

      assertOutcome(() => {
        expect(response.statusCode).toBe(500);
        expect(getDetailsExecute).toHaveBeenCalledWith({ carId: unknownId });
        expect(logger.error).toHaveBeenCalledWith(
          'Error retrieving car details',
          expect.objectContaining({
            carId: unknownId,
            error: 'Database unavailable',
          })
        );
      });
    });
  });
});
