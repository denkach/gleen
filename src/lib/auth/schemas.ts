import { z } from 'zod';

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Enter your email address.')
  .max(254, 'Email address is too long.')
  .email('Enter a valid email address.')
  .transform((value) => value.toLowerCase());

export const passwordSchema = z
  .string()
  .min(8, 'Use at least 8 characters.')
  .max(72, 'Use no more than 72 characters.')
  .regex(/[A-Za-z]/, 'Add at least one letter.')
  .regex(/[0-9]/, 'Add at least one number.');

export const passwordConfirmationSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });
