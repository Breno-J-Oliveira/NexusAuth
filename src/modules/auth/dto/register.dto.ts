import { z } from 'zod';

// SECURITY: Common weak passwords list (top 100 most common)
const COMMON_PASSWORDS = [
  'password', '123456', '12345678', 'qwerty', 'abc123', 'monkey', '1234567',
  'letmein', 'trustno1', 'dragon', 'baseball', 'iloveyou', 'master', 'sunshine',
  'ashley', 'bailey', 'shadow', '123123', '654321', 'superman', 'qazwsx',
  'michael', 'football', 'password1', 'password123', 'welcome', 'jesus',
  'ninja', 'mustang', 'password2', 'jordan', 'harley', 'thomas', 'charlie',
  'andrew', 'summer', 'love', 'soccer', 'hockey', 'killer', 'george',
  'computer', 'secret', 'admin', '1234', '12345', '123456789', '1234567890',
];

// SECURITY: Enhanced password validation with common password check
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must not exceed 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one symbol')
  // SECURITY: Block common weak passwords
  .refine(
    (val) => !COMMON_PASSWORDS.includes(val.toLowerCase()),
    'Password is too common. Please choose a stronger password.'
  )
  // SECURITY: Block sequential characters
  .refine(
    (val) => !/(.)\1{3,}/.test(val),
    'Password must not contain more than 3 consecutive identical characters'
  )
  // SECURITY: Block keyboard patterns
  .refine(
    (val) => !/qwerty|asdf|zxcv|1234|abcd/i.test(val),
    'Password must not contain common keyboard patterns'
  );

// SECURITY: Email validation with additional checks
const emailSchema = z
  .string()
  .email('Invalid email format')
  .max(254, 'Email must not exceed 254 characters')
  .transform((val: string) => val.toLowerCase().trim())
  // SECURITY: Block disposable email domains (common ones)
  .refine(
    (val) => {
      const disposableDomains = [
        'tempmail.com', 'throwaway.email', 'guerrillamail.com', 'mailinator.com',
        'yopmail.com', '10minutemail.com', 'trashmail.com', 'fakeinbox.com',
      ];
      const domain = val.split('@')[1];
      return !disposableDomains.includes(domain);
    },
    'Disposable email addresses are not allowed'
  );

// SECURITY: Name validation with sanitization
const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name must not exceed 100 characters')
  .transform((val: string) => val.trim())
  // SECURITY: Remove potentially dangerous characters
  .refine(
    (val) => !/[<>{}]/.test(val),
    'Name contains invalid characters'
  );

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
});

export type RegisterDto = z.infer<typeof registerSchema>;
