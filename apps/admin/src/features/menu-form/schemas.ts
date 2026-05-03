import { z } from 'zod';

export const menuCreateSchema = z.object({
  code: z.string().trim().min(2, 'Code is required.').max(120),
  label: z.string().trim().min(2, 'Label is required.').max(160),
  parentCode: z.string().trim().optional(),
  path: z.string().trim().optional(),
  icon: z.string().trim().optional(),
  level: z.coerce.number().int().min(1).max(3),
  sortOrder: z.coerce.number().int().min(0),
  isActive: z.boolean(),
});

export const menuEditSchema = menuCreateSchema.omit({ code: true });

export type MenuCreateFormValues = z.infer<typeof menuCreateSchema>;
export type MenuEditFormValues = z.infer<typeof menuEditSchema>;
