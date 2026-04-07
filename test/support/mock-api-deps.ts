import type { Logger } from '@aws-lambda-powertools/logger';
import type { UseCaseFactory } from '@application/factories/use-case-factory';
import { vi, type Mock } from 'vitest';

export type TestLoggerDouble = {
  addContext: Mock;
  logEventIfEnabled: Mock;
  info: Mock;
  debug: Mock;
  warn: Mock;
  error: Mock;
};

/**
 * Minimal logger double for handler tests (Powertools Logger has a large surface area).
 */
export function createTestLogger(): TestLoggerDouble & Logger {
  const double: TestLoggerDouble = {
    addContext: vi.fn(),
    logEventIfEnabled: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
  return double as TestLoggerDouble & Logger;
}

export type MockedUseCaseFactory = {
  factory: UseCaseFactory;
  listExecute: ReturnType<typeof vi.fn>;
  getDetailsExecute: ReturnType<typeof vi.fn>;
  createExecute: ReturnType<typeof vi.fn>;
};

/**
 * Use-case factory with `execute` fns you can configure per scenario (`mockResolvedValue`, etc.).
 */
export function createMockedUseCaseFactory(): MockedUseCaseFactory {
  const listExecute = vi.fn();
  const getDetailsExecute = vi.fn();
  const createExecute = vi.fn();

  const factory = {
    createListCarsUseCase: vi.fn(() => ({ execute: listExecute })),
    createGetCarDetailsUseCase: vi.fn(() => ({ execute: getDetailsExecute })),
    createCreateCarUseCase: vi.fn(() => ({ execute: createExecute })),
  } as unknown as UseCaseFactory;

  return { factory, listExecute, getDetailsExecute, createExecute };
}
