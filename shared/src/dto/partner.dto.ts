import type { ApprovalStatus, OperatingStatus } from '../enums'

export interface CreateBranchDto {
  name: string
  address: string
  region: string
}

export type UpdateBranchDto = Partial<CreateBranchDto>

export interface RegisterPartnerDto {
  email?: string
  phone?: string
  password: string
  legalName: string
  taxCode: string
  representative: string
  businessCategory?: string
  logoUrl?: string
  branches: CreateBranchDto[]
}

export interface UpdatePartnerDto {
  legalName?: string
  taxCode?: string
  representative?: string
  businessCategory?: string
  logoUrl?: string | null
}

export interface BranchDto {
  id: number
  partnerId: string
  name: string
  address: string
  region: string
}

export interface PartnerDto {
  id: string
  ownerUserId: string
  legalName: string
  taxCode: string
  representative: string
  businessCategory: string | null
  logoUrl: string | null
  approvalStatus: ApprovalStatus
  rejectReason: string | null
  operatingStatus: OperatingStatus
  branches: BranchDto[]
  createdAt: string
  updatedAt: string
}

export interface AdminPartnerDto extends PartnerDto {
  owner: {
    email: string | null
    phone: string | null
    fullName: string
  }
}

export interface ListPartnersDto {
  partners: AdminPartnerDto[]
  pagination: {
    page: number
    limit: number
    total: number
  }
}
