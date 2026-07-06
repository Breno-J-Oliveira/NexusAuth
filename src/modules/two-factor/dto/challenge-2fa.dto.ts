import { z } from 'zod';

export const challenge2faSchema = z.object({
  challengeToken: z.string().min(1),
  code: z.string().min(1),
});

export type Challenge2faDto = z.infer<typeof challenge2faSchema>;
