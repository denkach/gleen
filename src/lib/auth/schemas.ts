import { z } from 'zod';

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'email_required')
  .max(254, 'email_too_long')
  .email('email_invalid')
  .transform((value) => value.toLowerCase());

export const passwordSchema = z
  .string()
  .min(8, 'password_too_short')
  .max(72, 'password_too_long')
  .regex(/[A-Za-z]/, 'password_letter_required')
  .regex(/[0-9]/, 'password_number_required');

export const passwordConfirmationSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'password_confirmation_mismatch',
    path: ['confirmPassword'],
  });
