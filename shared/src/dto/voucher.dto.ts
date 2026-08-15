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
  soldQuantity?: number
  issuedCodeCount?: number
  usedCodeCount?: number
  expiredCodeCount?: number

  isMultiUse: boolean
  usesPerCode: number | null

  status: 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'ON_SALE' | 'PAUSED' | 'DISCONTINUED'

  rejectReason: string | null

  createdAt: string
  updatedAt: string
}
