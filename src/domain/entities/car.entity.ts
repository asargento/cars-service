import { type CarCreateProps } from '@/handlers/api-handler-factory';
import { randomUUID } from 'crypto';

export interface CarProps extends CarCreateProps {
  id?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/** Wire format for `JSON.stringify(car)` — explicit surface, no class internals. */
export type CarJson = {
  id: string;
  make: string;
  model: string;
  year: number;
  createdAt: string;
  updatedAt: string;
};

export class Car {
  public readonly id: string;
  public readonly make: string;
  public readonly model: string;
  public readonly year: number;
  public readonly createdAt: Date;
  public updatedAt: Date;

  private constructor(props: CarProps) {
    this.id = props.id ?? randomUUID();
    this.make = props.make;
    this.model = props.model;
    this.year = props.year;
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? new Date();
  }

  /** Used by `JSON.stringify` so HTTP responses and logs do not leak ad-hoc enumerable fields. */
  toJSON(): CarJson {
    return {
      id: this.id,
      make: this.make,
      model: this.model,
      year: this.year,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }

  static create(props: Omit<CarProps, 'id' | 'createdAt' | 'updatedAt'>): Car {
    return new Car(props);
  }

  static reconstitute(props: CarProps): Car {
    return new Car(props);
  }
}
