import { z } from 'zod';

export const CreateCarRequestSchema = z.object({
  make: z.string(),
  model: z.string(),
  year: z
    .number()
    .int()
    .min(1886)
    .max(new Date().getFullYear() + 1), // Cars were invented around 1886
});

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
