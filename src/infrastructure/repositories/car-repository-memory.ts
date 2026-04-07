import { Car } from '@domain/entities';
import { CarNotFoundError } from '@domain/errors';
import { type CarsRepository } from '@domain/repositories';

export class CarRepositoryMemory implements CarsRepository {
  private cars: Record<string, Car> = {};

  async listCars(): Promise<Car[]> {
    return Object.values(this.cars);
  }

  async getCarById(id: string): Promise<Car> {
    if (!this.cars[id]) {
      throw new CarNotFoundError(id);
    }

    const stored = this.cars[id];
    return Car.reconstitute({
      id: stored.id,
      make: stored.make,
      model: stored.model,
      year: stored.year,
      createdAt: stored.createdAt,
      updatedAt: stored.updatedAt,
    });
  }

  async storeCar(car: Car): Promise<void> {
    this.cars[car.id] = car;
  }
}
