/**
 * Thrown when a car aggregate cannot be loaded by id (domain / repository contract).
 */
export class CarNotFoundError extends Error {
  constructor(public readonly carId: string) {
    super(`Car not found: ${carId}`);
    this.name = 'CarNotFoundError';
  }
}
