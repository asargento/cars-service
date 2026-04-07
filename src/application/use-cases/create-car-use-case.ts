import { Car } from '@domain/entities';
import { UseCase } from './use-case';
import { type CarCreateProps } from '@/handlers/api-handler-factory';

export class CreateCarUseCase extends UseCase<Car, CarCreateProps> {
  async execute(carProps: CarCreateProps): Promise<Car> {
    const car = Car.create(carProps);
    await this.carsRepository.storeCar(car);
    return car;
  }
}
