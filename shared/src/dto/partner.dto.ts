import type { ApprovalStatus, OperatingStatus } from '../enums'

export interface CreatePartnerDto {
  legalName: string
  taxCode: string
  representative: string
}

export interface RegisterPartnerDto {
  email: string
  phone?: string
  password: string
  businessName: string
  businessRegNumber: string
  taxId: string
  representativeName: string
  representativeContact: string
  branches: Array<CreateBranchDto & { contact?: string }>
}

export type UpdatePartnerDto = Partial<CreatePartnerDto>

export interface CreateBranchDto {
  name: string
  address: string
  region: string
}

export type UpdateBranchDto = Partial<CreateBranchDto>

export interface ReviewPartnerDto {
  action: 'approve' | 'reject'
  reason?: string
}

export interface ChangePartnerStatusDto {
  action: 'lock' | 'unlock'
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
  approvalStatus: ApprovalStatus
  rejectReason: string | null
  operatingStatus: OperatingStatus
  branches?: BranchDto[]
  createdAt: string
  updatedAt: string
}
