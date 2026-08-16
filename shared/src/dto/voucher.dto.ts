import { z } from 'zod'

// ─── Query Validation cho Tìm kiếm ──────────────────────────────────────────

export const searchVoucherQuerySchema = z.object({
  keyword: z.string().optional(),
  minPrice: z
    .string()
    .optional()
    .transform((val) => (val ? parseFloat(val) : undefined))
    .refine((val) => val === undefined || !isNaN(val), { message: 'minPrice phải là số' }),
  maxPrice: z
    .string()
    .optional()
    .transform((val) => (val ? parseFloat(val) : undefined))
    .refine((val) => val === undefined || !isNaN(val), { message: 'maxPrice phải là số' }),
  category: z.string().optional(),
  region: z.string().optional(),
  partnerId: z.string().optional(),
  minDiscount: z
    .string()
    .optional()
    .transform((val) => (val ? parseFloat(val) : undefined))
    .refine((val) => val === undefined || (!isNaN(val) && val >= 0), { message: 'minDiscount phải là số >= 0' }),

  // Phân trang
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .refine((val) => val === undefined || (!isNaN(val) && val > 0), { message: 'page phải lớn hơn 0' }),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20))
    .refine((val) => val === undefined || (!isNaN(val) && val > 0 && val <= 100), { message: 'limit từ 1 đến 100' })
})

export type SearchVoucherQueryDto = z.infer<typeof searchVoucherQuerySchema>

// ─── Responses ────────────────────────────────────────────────────────────

export interface VoucherResponse {
  id: string
  partnerId: string
  categoryId: number | null
  title: string
  description: string
  imageUrl: string | null
  originalPrice: string // Decimal format
  salePrice: string // Decimal format
  salePeriodStart: string // ISO Date
  salePeriodEnd: string // ISO Date
  usagePeriodStart: string // ISO Date
  usagePeriodEnd: string // ISO Date
  totalQuantity: number
  soldQuantity: number
  remainingQuantity: number
  discountPercentage: number
  isMultiUse: boolean
  usesPerCode: number | null
  status: string
  createdAt: string
  updatedAt: string
  partner: { businessName: string }
  category: string
  terms: string | null
  voucherBranches: any[]
}

export interface VoucherListResponse {
  vouchers: VoucherResponse[]
  pagination: {
    page: number
    limit: number
    total: number
  }
}

export interface CreateVoucherDto {
  categoryId?: number | null

  name: string
  description: string

  imageUrl?: string | null

  originalPrice: number
  salePrice: number

  saleStart: string
  saleEnd: string

  usageStart: string
  usageEnd: string

  totalQuantity: number

  isMultiUse: boolean
  usesPerCode?: number | null

  branchIds?: number[]
}

export type UpdateVoucherDto = Partial<CreateVoucherDto>

export interface VoucherApprovalDto {
  action: 'approve' | 'reject'
  reason?: string
}

export interface VoucherStatusDto {
  action: 'publish' | 'suspend' | 'unpublish'
}

export interface VoucherDto {
  id: string
  partnerId: string

  categoryId: number | null

  name: string
  description: string

  imageUrl: string | null

  originalPrice: string
  salePrice: string

  saleStart: string
  saleEnd: string

  usageStart: string
  usageEnd: string

  totalQuantity: number
  remainingQuantity: number

  isMultiUse: boolean
  usesPerCode: number | null

  status: 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'ON_SALE' | 'PAUSED' | 'DISCONTINUED'

  rejectReason: string | null

  createdAt: string
  updatedAt: string
}
