import { type Car } from '@domain/entities';

export interface CarsRepository {
  listCars(): Promise<Car[]>;
  getCarById(id: string): Promise<Car>;
  storeCar(car: Car): Promise<void>;
}
