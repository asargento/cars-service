import { type Car } from '@domain/entities';
import { UseCase } from './use-case';

export class ListCarsUseCase extends UseCase<Car[]> {
  async execute(): Promise<Car[]> {
    return this.carsRepository.listCars();
  }
}
