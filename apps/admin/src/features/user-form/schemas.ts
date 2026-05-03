import { z } from 'zod';

export const userCreateSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  fullName: z.string().trim().min(1, 'Enter a full name.').max(255),
  password: z.string().min(12, 'Use at least 12 characters.').max(128),
  groupCodes: z.array(z.string()).min(1, 'Select at least one group.'),
});

export const userEditSchema = z.object({
  fullName: z.string().trim().min(1, 'Enter a full name.').max(255),
  status: z.enum(['active', 'inactive', 'locked']),
  groupCodes: z.array(z.string()).min(1, 'Select at least one group.'),
});

export type UserCreateFormValues = z.infer<typeof userCreateSchema>;
export type UserEditFormValues = z.infer<typeof userEditSchema>;
