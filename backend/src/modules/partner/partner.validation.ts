import { z } from 'zod'

const emailSchema = z.string().trim().toLowerCase().email('Email không đúng định dạng').max(255)
const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9]{10,15}$/, 'Số điện thoại không đúng định dạng')
const passwordSchema = z
  .string()
  .min(8, 'Mật khẩu phải từ 8 ký tự trở lên')
  .max(72, 'Mật khẩu không được vượt quá 72 ký tự')
  .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'Mật khẩu không được vượt quá 72 byte')

export const branchSchema = z.object({
  name: z.string().trim().min(1, 'Tên chi nhánh không được để trống').max(255),
  address: z.string().trim().min(1, 'Địa chỉ không được để trống').max(2000),
  region: z.string().trim().min(1, 'Khu vực không được để trống').max(128)
})

export const registerPartnerSchema = z
  .object({
    email: emailSchema.optional(),
    phone: phoneSchema.optional(),
    password: passwordSchema,
    legalName: z.string().trim().min(1, 'Tên pháp lý không được để trống').max(255),
    taxCode: z.string().trim().min(1, 'Mã số thuế không được để trống').max(32),
    representative: z.string().trim().min(1, 'Người đại diện không được để trống').max(255),
    branches: z.array(branchSchema).min(1, 'Cần ít nhất một chi nhánh').max(50)
  })
  .refine((data) => data.email || data.phone, {
    message: 'Phải cung cấp email hoặc số điện thoại để đăng ký',
    path: ['email']
  })

export const updatePartnerSchema = z
  .object({
    legalName: z.string().trim().min(1).max(255).optional(),
    taxCode: z.string().trim().min(1).max(32).optional(),
    representative: z.string().trim().min(1).max(255).optional()
  })
  .refine((data) => Object.keys(data).length > 0, 'Cần ít nhất một trường để cập nhật')

export const updateBranchSchema = branchSchema.partial().refine((data) => Object.keys(data).length > 0, {
  message: 'Cần ít nhất một trường để cập nhật'
})

export const partnerIdSchema = z.object({ id: z.string().uuid('Partner ID không hợp lệ') })
export const branchIdSchema = z.object({ id: z.coerce.number().int().positive('Branch ID không hợp lệ') })
export const adminBranchIdSchema = z.object({
  partnerId: z.string().uuid('Partner ID không hợp lệ'),
  id: z.coerce.number().int().positive('Branch ID không hợp lệ')
})
export const partnerListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(255).optional(),
  approvalStatus: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  operatingStatus: z.enum(['ACTIVE', 'SUSPENDED']).optional()
})
export const approvalSchema = z
  .object({
    action: z.enum(['approve', 'reject']),
    reason: z.string().trim().min(1, 'Lý do từ chối không được để trống').max(2000).optional()
  })
  .refine((data) => data.action !== 'reject' || data.reason, {
    message: 'Lý do từ chối là bắt buộc',
    path: ['reason']
  })
export const operatingStatusSchema = z.object({ action: z.enum(['lock', 'unlock']) })
export const redeemCodeSchema = z.object({
  code: z.string().trim().min(1, 'Mã voucher không được để trống').max(32),
  branchId: z.coerce.number().int().positive('Chi nhánh không hợp lệ')
})

export type RegisterPartnerDto = z.infer<typeof registerPartnerSchema>
export type UpdatePartnerDto = z.infer<typeof updatePartnerSchema>
export type BranchDto = z.infer<typeof branchSchema>
export type UpdateBranchDto = z.infer<typeof updateBranchSchema>
export type PartnerListDto = z.infer<typeof partnerListSchema>
export type ApprovalDto = z.infer<typeof approvalSchema>
export type OperatingStatusDto = z.infer<typeof operatingStatusSchema>
export type RedeemCodeDto = z.infer<typeof redeemCodeSchema>
