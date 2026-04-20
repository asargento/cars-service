import { type Logger } from '@aws-lambda-powertools/logger';
import { type SecretsProvider } from '@aws-lambda-powertools/parameters/secrets';
import {
  type APIGatewayAuthorizerResultContext,
  type APIGatewayAuthorizerWithContextResult,
  type APIGatewayRequestAuthorizerEventV2,
} from 'aws-lambda';

export type CreateApiAuthorizerHandlerOptions = {
  logger: Logger;
  secretsProvider: SecretsProvider;
};

export interface SecurityContext extends APIGatewayAuthorizerResultContext {
  userId?: string;
  error?: string;
}

export function createApiAuthorizerHandler({
  logger,
  secretsProvider,
}: CreateApiAuthorizerHandlerOptions) {
  const apiKeySecretId = process.env.API_KEY_SECRET_ARN || '';

  return async (
    event: APIGatewayRequestAuthorizerEventV2
  ): Promise<APIGatewayAuthorizerWithContextResult<SecurityContext>> => {
    const context: SecurityContext = {};
    let effect: 'Allow' | 'Deny' = 'Allow';
    logger.info('Authorizing request', { event });

    let apiKey: string | undefined;
    try {
      apiKey = await secretsProvider.get(apiKeySecretId, { maxAge: 3600 }); // Cache it for 60 minutes
      logger.info('API key retrieved successfully from Secrets Manager');
      if (!apiKey) {
        logger.error('API key not found in Secrets Manager');
        context.error = 'Configuration error: API key not found in Secrets Manager';
        effect = 'Deny';
      } else if (event.headers?.authorization) {
        if (event.headers.authorization === apiKey) {
          logger.info('API key valid, allowing access');
          context.userId = 'anonymous';
        } else {
          logger.warn('Invalid API key, denying access');
          effect = 'Deny';
          context.error = 'Unauthorized: Invalid API key';
        }
      } else {
        logger.warn('Authorization header missing, denying access');
        effect = 'Deny';
        context.error = 'Unauthorized: Missing authorization header';
      }
    } catch (error) {
      logger.error('Error retrieving API key from Secrets Manager', {
        error: (error as Error).message,
      });
      context.error = 'Configuration error: Error retrieving API key from Secrets Manager';
      effect = 'Deny';
    }

    const response: APIGatewayAuthorizerWithContextResult<SecurityContext> = {
      context,
      policyDocument: {
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: effect, // Allow | Deny
            Resource: event.routeArn,
          },
        ],
        Version: '2012-10-17',
      },
      principalId: 'anonymous',
    };
    logger.info('Authorizer response', { response });
    return response;
  };
}
