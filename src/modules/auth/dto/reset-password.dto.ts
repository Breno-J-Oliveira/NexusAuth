import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must not exceed 128 characters') // M6 fix: add max length
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one symbol');

export const resetPasswordSchema = z.object({
  token: z.string().uuid(),
  newPassword: passwordSchema,
});

export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;
