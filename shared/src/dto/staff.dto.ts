import type { StaffStatus } from '../enums'
import type { BranchDto } from './partner.dto'

export interface PartnerStaffAssignmentDto {
  branchId: number
  branch: BranchDto
}

export interface PartnerStaffDto {
  id: string
  status: StaffStatus
  user: {
    id: string
    fullName: string
    email: string
    phone: string | null
    status: 'ACTIVE' | 'LOCKED'
  }
  assignments: PartnerStaffAssignmentDto[]
}

export interface CreatePartnerStaffDto {
  fullName: string
  email: string
  phone?: string
  password: string
  branchIds: number[]
}

export interface UpdatePartnerStaffDto {
  fullName?: string
  email?: string
  phone?: string
  password?: string
  branchIds?: number[]
  status?: StaffStatus
  locked?: boolean
}
