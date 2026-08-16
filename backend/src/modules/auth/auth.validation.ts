import { z } from 'zod'

const emailSchema = z.string().trim().toLowerCase().email('Email không đúng định dạng').max(255)
const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9]{10,15}$/, 'Số điện thoại không đúng định dạng')
const bcryptInputSchema = z
  .string()
  .max(72, 'Mật khẩu không được vượt quá 72 ký tự')
  .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'Mật khẩu không được vượt quá 72 byte')
const passwordSchema = bcryptInputSchema.min(8, 'Mật khẩu phải từ 8 ký tự trở lên')
const identifierSchema = z
  .string()
  .trim()
  .min(1, 'Vui lòng nhập email hoặc số điện thoại')
  .max(255)
  .transform((value) => (value.includes('@') ? value.toLowerCase() : value))

export const registerSchema = z
  .object({
    email: emailSchema.optional(),
    phone: phoneSchema.optional(),
    password: passwordSchema,
    fullName: z.string().trim().min(1, 'Họ và tên không được để trống').max(255),
    address: z.string().trim().max(2000).optional()
  })
  .refine((data) => data.email || data.phone, {
    message: 'Phải cung cấp email hoặc số điện thoại để đăng ký',
    path: ['email']
  })

export const loginSchema = z.object({
  identifier: identifierSchema,
  password: bcryptInputSchema.min(1, 'Vui lòng nhập mật khẩu')
})

export const passwordResetSchema = z.object({
  identifier: identifierSchema
})

export const changePasswordSchema = z.object({
  currentPassword: bcryptInputSchema.min(1, 'Vui lòng nhập mật khẩu hiện tại'),
  newPassword: passwordSchema
})

export const updateProfileSchema = z
  .object({
    fullName: z.string().trim().min(1, 'Họ và tên không được để trống').max(255).optional(),
    address: z.string().trim().max(2000).optional(),
    email: emailSchema.optional(),
    phone: phoneSchema.optional()
  })
  .refine((data) => Object.keys(data).length > 0, 'Cần ít nhất một trường để cập nhật')

export type RegisterDto = z.infer<typeof registerSchema>
export type LoginDto = z.infer<typeof loginSchema>
export type PasswordResetDto = z.infer<typeof passwordResetSchema>
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>
export type UpdateProfileDto = z.infer<typeof updateProfileSchema>
