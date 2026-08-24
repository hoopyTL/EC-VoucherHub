import { z } from 'zod'

const email = z.string().trim().toLowerCase().email().max(255)
const phone = z
  .string()
  .trim()
  .regex(/^\+?[0-9]{10,15}$/)
  .optional()
const branchIds = z.array(z.coerce.number().int().positive()).min(1, 'Phải phân công ít nhất một chi nhánh').max(50)

export const createStaffSchema = z.object({
  fullName: z.string().trim().min(1).max(255),
  email,
  phone,
  password: z.string().min(8).max(72),
  branchIds
})
export const updateStaffSchema = z
  .object({
    fullName: z.string().trim().min(1).max(255).optional(),
    email: email.optional(),
    phone,
    password: z.string().min(8).max(72).optional(),
    branchIds: branchIds.optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
    locked: z.boolean().optional()
  })
  .refine((value) => Object.keys(value).length > 0, 'Cần ít nhất một trường để cập nhật')
export const staffIdSchema = z.object({ id: z.string().uuid() })
export type CreateStaffInput = z.infer<typeof createStaffSchema>
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>
