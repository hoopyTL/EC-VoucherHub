import type {
  BranchDto,
  CategoryDto,
  CreateVoucherDto,
  ListVouchersDto,
  VoucherDto,
  VoucherStatus
} from '@voucher/shared'
import type { CreateVoucherRequest } from '@ui-contracts'

import { api } from './api'

interface ApiEnvelope<T> {
  success: true
  data: T
}

export interface PartnerBranch extends Omit<BranchDto, 'id'> {
  id: string
  isActive: boolean
}

export interface PartnerVoucherBranchLink {
  branchId: string
  branch: PartnerBranch
}

/** UI view model retained to avoid coupling the existing pages to wire names. */
export interface PartnerVoucher {
  id: string
  title: string
  description: string
  category: string
  categoryId: number | null
  originalPrice: string
  salePrice: string
  totalQuantity: number
  soldQuantity: number
  isMultiUse: boolean
  usesPerCode: number | null
  salePeriodStart: string
  salePeriodEnd: string
  usagePeriodStart: string
  usagePeriodEnd: string
  terms: null
  imageUrl: string | null
  status: VoucherStatus
  rejectionReason: string | null
  partnerId: string
  createdAt: string
  updatedAt: string
  voucherBranches: PartnerVoucherBranchLink[]
}

export interface ListPartnerVouchersResponse {
  vouchers: PartnerVoucher[]
  pagination: ListVouchersDto['pagination']
}

export const PARTNER_VOUCHERS_QUERY_KEY = ['partner-vouchers'] as const
export const PARTNER_BRANCHES_QUERY_KEY = ['partner-branches'] as const
export const VOUCHER_CATEGORIES_QUERY_KEY = ['voucher-categories'] as const

function toPartnerBranch(branch: BranchDto): PartnerBranch {
  return { ...branch, id: String(branch.id), isActive: true }
}

function toPartnerVoucher(voucher: VoucherDto): PartnerVoucher {
  return {
    id: voucher.id,
    title: voucher.name,
    description: voucher.description,
    category: voucher.category?.name ?? 'Chưa phân loại',
    categoryId: voucher.categoryId,
    originalPrice: voucher.originalPrice,
    salePrice: voucher.salePrice,
    totalQuantity: voucher.totalQuantity,
    soldQuantity: voucher.soldQuantity,
    isMultiUse: voucher.isMultiUse,
    usesPerCode: voucher.usesPerCode,
    salePeriodStart: voucher.saleStart,
    salePeriodEnd: voucher.saleEnd,
    usagePeriodStart: voucher.usageStart,
    usagePeriodEnd: voucher.usageEnd,
    terms: null,
    imageUrl: voucher.imageUrl,
    status: voucher.status,
    rejectionReason: voucher.rejectReason,
    partnerId: voucher.partnerId,
    createdAt: voucher.createdAt,
    updatedAt: voucher.updatedAt,
    voucherBranches: voucher.branches.map((branch) => ({
      branchId: String(branch.id),
      branch: toPartnerBranch(branch)
    }))
  }
}

function toCreateVoucherDto(body: CreateVoucherRequest): CreateVoucherDto {
  return {
    categoryId: Number(body.category),
    name: body.title,
    description: body.description,
    imageUrl: body.imageUrl,
    originalPrice: body.originalPrice,
    salePrice: body.salePrice,
    saleStart: body.salePeriodStart,
    saleEnd: body.salePeriodEnd,
    usageStart: body.usagePeriodStart,
    usageEnd: body.usagePeriodEnd,
    totalQuantity: body.totalQuantity,
    isMultiUse: body.isMultiUse ?? false,
    usesPerCode: body.isMultiUse ? body.usesPerCode : null,
    branchIds: body.branchIds.map(Number)
  }
}

export async function listVoucherCategories(): Promise<CategoryDto[]> {
  const { data } = await api.get<ApiEnvelope<CategoryDto[]>>('/categories')
  return data.data
}

export async function listPartnerVouchers(page = 1, limit = 20): Promise<ListPartnerVouchersResponse> {
  const { data } = await api.get<ApiEnvelope<ListVouchersDto>>('/partner/vouchers', { params: { page, limit } })
  return { ...data.data, vouchers: data.data.vouchers.map(toPartnerVoucher) }
}

export async function listPartnerBranches(): Promise<PartnerBranch[]> {
  const { data } = await api.get<ApiEnvelope<BranchDto[]>>('/partner/branches')
  return data.data.map(toPartnerBranch)
}

export async function createVoucher(body: CreateVoucherRequest): Promise<PartnerVoucher> {
  const { data } = await api.post<ApiEnvelope<VoucherDto>>('/vouchers', toCreateVoucherDto(body))
  return toPartnerVoucher(data.data)
}

export async function getPartnerVoucher(id: string): Promise<PartnerVoucher> {
  const { data } = await api.get<ApiEnvelope<VoucherDto>>(`/partner/vouchers/${id}`)
  return toPartnerVoucher(data.data)
}

export async function updatePartnerVoucher(id: string, body: CreateVoucherRequest): Promise<PartnerVoucher> {
  const { data } = await api.patch<ApiEnvelope<VoucherDto>>(`/vouchers/${id}`, toCreateVoucherDto(body))
  return toPartnerVoucher(data.data)
}

export async function uploadVoucherImage(file: File): Promise<string> {
  const body = new FormData()
  body.append('image', file)
  const { data } = await api.post<ApiEnvelope<{ url: string }>>('/vouchers/images', body)
  return data.data.url
}

export async function submitVoucher(id: string): Promise<PartnerVoucher> {
  const { data } = await api.post<ApiEnvelope<VoucherDto>>(`/vouchers/${id}/submission`)
  return toPartnerVoucher(data.data)
}

export async function returnVoucherToDraft(id: string): Promise<PartnerVoucher> {
  const { data } = await api.post<ApiEnvelope<VoucherDto>>(`/vouchers/${id}/draft`)
  return toPartnerVoucher(data.data)
}

export async function pauseVoucher(id: string): Promise<PartnerVoucher> {
  const { data } = await api.patch<ApiEnvelope<VoucherDto>>(`/vouchers/${id}/status`, { action: 'pause' })
  return toPartnerVoucher(data.data)
}

export async function resumeVoucher(id: string): Promise<PartnerVoucher> {
  const { data } = await api.patch<ApiEnvelope<VoucherDto>>(`/vouchers/${id}/status`, { action: 'resume' })
  return toPartnerVoucher(data.data)
}

export type VoucherAction = 'submit' | 'revise' | 'pause' | 'resume'

export function availableActions(status: VoucherStatus): VoucherAction[] {
  if (status === 'DRAFT') return ['submit']
  if (status === 'REJECTED') return ['revise']
  if (status === 'ON_SALE') return ['pause']
  if (status === 'PAUSED') return ['resume']
  return []
}

interface ApiErrorBody {
  error?: { code?: string; message?: string }
}

export function getApiErrorMessage(err: unknown, fallback: string): string {
  const response = (err as { response?: { status?: number; data?: ApiErrorBody } })?.response
  if (!response) return 'Unable to reach the server. Please check your connection and try again.'
  return response.data?.error?.message ?? fallback
}
