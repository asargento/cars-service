import { Logger } from '@aws-lambda-powertools/logger';
import { SecretsProvider } from '@aws-lambda-powertools/parameters/secrets';
import { createApiAuthorizerHandler } from './api-authorizer-factory';

const secretsProvider = new SecretsProvider();

export const handler = createApiAuthorizerHandler({
  logger: new Logger({ serviceName: 'cars-service' }),
  secretsProvider,
});
