import { z } from 'zod';
import { type CarCreateProps } from '@domain/entities/car.entity';

export const CreateCarRequestSchema = z.object({
  make: z.string(),
  model: z.string(),
  year: z
    .number()
    .int()
    .min(1886)
    .max(new Date().getFullYear() + 1), // Cars were invented around 1886
}) satisfies z.ZodType<CarCreateProps>;

export const CarResponseSchema = z.object({
  id: z.string(),
  make: z.string(),
  model: z.string(),
  year: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CarCreateRequestProps = z.infer<typeof CreateCarRequestSchema>;

export type CarResponseProps = z.infer<typeof CarResponseSchema>;

/** EventBridge `detail` for `detail-type: CarSubmitted` (same shape as HTTP create body). */
export const CarSubmittedDetailSchema = CreateCarRequestSchema;
export type CarSubmittedDetailProps = z.infer<typeof CarSubmittedDetailSchema>;
