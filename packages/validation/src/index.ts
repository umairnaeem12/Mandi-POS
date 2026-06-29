import { z } from 'zod';

// Shared Zod schemas reused by frontend forms and (optionally) backend DTOs.
// Extended in later phases (orders, invoices, menu, etc.).

export const loginSchema = z.object({
  identifier: z.string().min(1, 'Email or username is required'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;
