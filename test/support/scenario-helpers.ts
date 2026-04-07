import type { APIGatewayProxyEventV2, Context, EventBridgeEvent } from 'aws-lambda';
import { randomUUID } from 'node:crypto';
import { vi } from 'vitest';

/** BDD-style arrange step (Given). */
export function arrange<T>(fn: () => T): T {
  return fn();
}

/** BDD-style act step (When). */
export async function act<T>(fn: () => Promise<T>): Promise<T> {
  return fn();
}

/** BDD-style assert step (Then). */
export function assertOutcome(fn: () => void): void {
  fn();
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export function createHttpApiV2Event(options: {
  method: HttpMethod;
  path: string;
  body?: unknown;
  headers?: Record<string, string>;
}): APIGatewayProxyEventV2 {
  const { method, path, body, headers = {} } = options;
  const hasBody = body !== undefined;

  return {
    version: '2.0',
    routeKey: `${method} ${path}`,
    rawPath: path,
    rawQueryString: '',
    headers: {
      ...(hasBody ? { 'content-type': 'application/json' } : {}),
      ...headers,
    },
    requestContext: {
      accountId: '123456789012',
      apiId: 'test-api',
      domainName: 'test.execute-api.local',
      domainPrefix: 'test',
      http: {
        method,
        path,
        protocol: 'HTTP/1.1',
        sourceIp: '127.0.0.1',
        userAgent: 'vitest-bdd',
      },
      requestId: `req-${Math.random().toString(36).slice(2, 11)}`,
      routeKey: `${method} ${path}`,
      stage: '$default',
      time: '01/Jan/2026:00:00:00 +0000',
      timeEpoch: Date.now(),
    },
    body: hasBody ? JSON.stringify(body) : undefined,
    isBase64Encoded: false,
  };
}

/** Minimal EventBridge envelope for `detail-type: CarSubmitted` tests. */
export function createCarSubmittedEventBridgeEvent(detail: unknown): EventBridgeEvent<
  'CarSubmitted',
  unknown
> {
  return {
    version: '0',
    id: randomUUID(),
    'detail-type': 'CarSubmitted',
    source: 'test.cars',
    account: '123456789012',
    time: new Date().toISOString(),
    region: 'eu-west-1',
    resources: [],
    detail,
  };
}

export function createLambdaTestContext(overrides: Partial<Context> = {}): Context {
  return {
    callbackWaitsForEmptyEventLoop: false,
    functionName: 'cars-api-test',
    functionVersion: '1',
    invokedFunctionArn: 'arn:aws:lambda:eu-west-1:123456789012:function:cars-api-test',
    memoryLimitInMB: '256',
    awsRequestId: `aws-req-${Math.random().toString(36).slice(2, 11)}`,
    logGroupName: '/aws/lambda/cars-api-test',
    logStreamName: '2026/01/01/[$LATEST]test',
    getRemainingTimeInMillis: () => 10_000,
    done: vi.fn(),
    fail: vi.fn(),
    succeed: vi.fn(),
    ...overrides,
  };
}
