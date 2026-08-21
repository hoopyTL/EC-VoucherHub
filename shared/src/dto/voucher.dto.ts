import type { VoucherStatus } from '../enums'
import type { BranchDto } from './partner.dto'

export interface CategoryDto {
  id: number
  name: string
  parentId: number | null
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

export interface PartnerVoucherStatusDto {
  action: 'pause' | 'resume'
}

export interface AdminVoucherStatusDto {
  action: 'publish' | 'suspend' | 'resume' | 'discontinue'
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
  status: VoucherStatus
  rejectReason: string | null
  partner: {
    id: string
    legalName: string
  }
  category: CategoryDto | null
  branches: BranchDto[]
  soldQuantity: number
  issuedCodeCount: number
  usedCodeCount: number
  expiredCodeCount: number
  createdAt: string
  updatedAt: string
}

export interface ListVouchersDto {
  vouchers: VoucherDto[]
  pagination: {
    page: number
    limit: number
    total: number
  }
}
