import { z } from 'zod';

export const disable2faSchema = z.object({
  password: z.string().min(1),
  code: z.string().min(1),
});

export type Disable2faDto = z.infer<typeof disable2faSchema>;
