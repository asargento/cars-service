import { Car } from '@domain/entities';
import { describe, expect, it } from 'vitest';
import { createOnCarSubmittedHandler } from '@/handlers/events/event-handler-factory';
import {
  act,
  arrange,
  assertOutcome,
  createCarSubmittedEventBridgeEvent,
  createLambdaTestContext,
} from '../support/scenario-helpers';
import { createMockedUseCaseFactory, createTestLogger } from '../support/mock-api-deps';

describe('Feature: CarSubmitted EventBridge handler', () => {
  describe('Scenario: Valid detail', () => {
    it('Given a CarSubmitted event with valid detail, when the handler runs, then it creates a car and logs success', async () => {
      const logger = arrange(() => createTestLogger());
      const { factory, createExecute } = arrange(() => createMockedUseCaseFactory());
      const created = Car.create({ make: 'Event', model: 'Bus', year: 2023 });
      createExecute.mockResolvedValue(created);

      const handler = arrange(() =>
        createOnCarSubmittedHandler({ logger, useCaseFactory: factory })
      );
      const context = arrange(() =>
        createLambdaTestContext({ functionName: 'onCarSubmittedHandler-test' })
      );
      const event = arrange(() =>
        createCarSubmittedEventBridgeEvent({ make: 'Event', model: 'Bus', year: 2023 })
      );

      await act(() => handler(event, context));

      assertOutcome(() => {
        expect(createExecute).toHaveBeenCalledOnce();
        expect(createExecute).toHaveBeenCalledWith({
          make: 'Event',
          model: 'Bus',
          year: 2023,
        });
        expect(logger.info).toHaveBeenCalledWith('Processing CarSubmitted', {
          detail: { make: 'Event', model: 'Bus', year: 2023 },
        });
        expect(logger.info).toHaveBeenCalledWith(
          'Car created from CarSubmitted event',
          expect.objectContaining({ carId: created.id })
        );
      });
    });
  });

  describe('Scenario: Invalid detail', () => {
    it('Given a CarSubmitted event with invalid detail, when the handler runs, then it does not call create and logs an error', async () => {
      const logger = arrange(() => createTestLogger());
      const { factory, createExecute } = arrange(() => createMockedUseCaseFactory());

      const handler = arrange(() =>
        createOnCarSubmittedHandler({ logger, useCaseFactory: factory })
      );
      const context = arrange(() => createLambdaTestContext());
      const event = arrange(() =>
        createCarSubmittedEventBridgeEvent({ make: 'X', model: 'Y', year: 1700 })
      );

      await act(() => handler(event, context));

      assertOutcome(() => {
        expect(createExecute).not.toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalledWith(
          'Invalid CarSubmitted event detail',
          expect.objectContaining({ issues: expect.any(Object) })
        );
      });
    });
  });
});
