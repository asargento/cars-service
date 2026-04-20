import {
  act,
  arrange,
  assertOutcome,
  createRequestAuthorizerEvent,
} from '../support/scenario-helpers';
import { createSecretsProvider, createTestLogger } from '../support/mock-api-deps';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createApiAuthorizerHandler } from '@/handlers/rest/api-authorizer-factory';

/** Matches deployed shape (`!Ref` secret); stubbed so the handler resolves the same id as in production. */
const TEST_API_KEY_SECRET_ARN =
  'arn:aws:secretsmanager:eu-west-1:123456789012:secret:CarsServiceApiKey-AbCdEf';

describe('Feature: API Authorizer handler', () => {
  beforeEach(() => {
    vi.stubEnv('API_KEY_SECRET_ARN', TEST_API_KEY_SECRET_ARN);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('Scenario: Valid API key', () => {
    it('Given a valid API key, when the handler runs, then it returns an Allow policy', async () => {
      const logger = arrange(() => createTestLogger());
      const secretsProvider = arrange(() => createSecretsProvider());
      secretsProvider.get.mockResolvedValue('expected-api-key');

      const handler = arrange(() => createApiAuthorizerHandler({ logger, secretsProvider }));
      const event = arrange(() =>
        createRequestAuthorizerEvent({
          headers: { authorization: 'expected-api-key' },
        })
      );

      const result = await act(() => handler(event));

      assertOutcome(() => {
        expect(secretsProvider.get).toHaveBeenCalledWith(
          TEST_API_KEY_SECRET_ARN,
          expect.objectContaining({ maxAge: 3600 })
        );
        expect(result.policyDocument.Statement[0]?.Effect).toBe('Allow');
      });
    });
  });

  describe('Scenario: Invalid API key', () => {
    it('Given an invalid API key, when the handler runs, then it returns a Deny policy', async () => {
      const logger = arrange(() => createTestLogger());
      const secretsProvider = arrange(() => createSecretsProvider());
      secretsProvider.get.mockResolvedValue('expected-api-key');

      const handler = arrange(() => createApiAuthorizerHandler({ logger, secretsProvider }));
      const event = arrange(() =>
        createRequestAuthorizerEvent({
          headers: { authorization: 'wrong-key' },
        })
      );

      const result = await act(() => handler(event));

      assertOutcome(() => {
        expect(result.policyDocument.Statement[0]?.Effect).toBe('Deny');
        expect(result.context.error).toBe('Unauthorized: Invalid API key');
      });
    });
  });

  describe('Scenario: Missing API key', () => {
    it('Given a missing API key, when the handler runs, then it returns a Deny policy', async () => {
      const logger = arrange(() => createTestLogger());
      const secretsProvider = arrange(() => createSecretsProvider());
      secretsProvider.get.mockResolvedValue(undefined);

      const handler = arrange(() => createApiAuthorizerHandler({ logger, secretsProvider }));
      const event = arrange(() => createRequestAuthorizerEvent());

      const result = await act(() => handler(event));

      assertOutcome(() => {
        expect(result.policyDocument.Statement[0]?.Effect).toBe('Deny');
        expect(result.context.error).toBe(
          'Configuration error: API key not found in Secrets Manager'
        );
      });
    });
  });

  describe('Scenario: Error retrieving API key', () => {
    it('Given an error retrieving the API key, when the handler runs, then it returns a Deny policy', async () => {
      const logger = arrange(() => createTestLogger());
      const secretsProvider = arrange(() => createSecretsProvider());
      secretsProvider.get.mockRejectedValue(new Error('Error retrieving API key'));

      const handler = arrange(() => createApiAuthorizerHandler({ logger, secretsProvider }));
      const event = arrange(() => createRequestAuthorizerEvent());

      const result = await act(() => handler(event));

      assertOutcome(() => {
        expect(result.policyDocument.Statement[0]?.Effect).toBe('Deny');
        expect(result.context.error).toBe(
          'Configuration error: Error retrieving API key from Secrets Manager'
        );
      });
    });
  });
});
