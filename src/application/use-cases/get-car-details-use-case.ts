import { type Car } from '@domain/entities';
import { UseCase } from './use-case';

export type ExecuteOptions = {
  carId: string;
};

export class GetCarDetailsUseCase extends UseCase<Car, ExecuteOptions> {
  async execute({ carId }: ExecuteOptions): Promise<Car> {
    return this.carsRepository.getCarById(carId);
  }
}
