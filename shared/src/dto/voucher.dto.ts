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
  // TODO: Cho Đợt 2 - Lọc theo danh mục và khu vực
  categoryId: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined))
    .refine((val) => val === undefined || !isNaN(val), { message: 'categoryId phải là số nguyên' }),
  region: z.string().optional(),

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
  name: string
  description: string
  imageUrl: string | null
  originalPrice: string // Decimal format
  salePrice: string // Decimal format
  saleStart: string // ISO Date
  saleEnd: string // ISO Date
  usageStart: string // ISO Date
  usageEnd: string // ISO Date
  totalQuantity: number
  remainingQuantity: number
  isMultiUse: boolean
  usesPerCode: number | null
  status: string
  createdAt: string
  updatedAt: string
}

export interface VoucherListResponse {
  items: VoucherResponse[]
  total: number
  page: number
  limit: number
  totalPages: number
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
