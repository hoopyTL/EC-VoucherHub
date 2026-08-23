import { RoleName } from '@voucher/shared'
import prisma from '~/configs/prisma'
import { AppError } from '~/utils/app-error'
import { hashPassword } from '~/utils/password'
import { getCompatibleRoleNames } from '~/utils/role'
import type { CreateStaffInput, UpdateStaffInput } from './staff.validation'

const staffInclude = {
  user: { select: { id: true, fullName: true, email: true, phone: true, status: true } },
  assignments: { include: { branch: true }, orderBy: { branchId: 'asc' as const } }
}
async function ownerPartner(ownerUserId: string) {
  const partner = await prisma.partner.findUnique({ where: { ownerUserId }, select: { id: true } })
  if (!partner) throw AppError.forbidden('Chỉ chủ đối tác được quản lý nhân viên')
  return partner
}
async function assertBranches(partnerId: string, branchIds: number[]) {
  const ids = [...new Set(branchIds)]
  const count = await prisma.branch.count({ where: { partnerId, id: { in: ids } } })
  if (count !== ids.length) throw AppError.forbidden('Có chi nhánh không thuộc đối tác của bạn')
  return ids
}
async function ownedStaff(ownerUserId: string, staffId: string) {
  const partner = await ownerPartner(ownerUserId)
  const staff = await prisma.partnerStaff.findFirst({ where: { id: staffId, partnerId: partner.id } })
  if (!staff) throw AppError.notFound('Nhân viên')
  return { partner, staff }
}

export const staffService = {
  async list(ownerUserId: string) {
    const partner = await ownerPartner(ownerUserId)
    return prisma.partnerStaff.findMany({
      where: { partnerId: partner.id },
      include: staffInclude,
      orderBy: { createdAt: 'desc' }
    })
  },
  async create(ownerUserId: string, input: CreateStaffInput) {
    const partner = await ownerPartner(ownerUserId)
    const ids = await assertBranches(partner.id, input.branchIds)
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: input.email }, ...(input.phone ? [{ phone: input.phone }] : [])] }
    })
    if (existing) throw AppError.duplicate('Email hoặc số điện thoại đã được sử dụng')
    const role = await prisma.role.findFirst({ where: { name: { in: getCompatibleRoleNames(RoleName.STAFF) } } })
    if (!role) throw AppError.internal('Vai trò STAFF chưa được cấu hình; hãy chạy migration/seed')
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          fullName: input.fullName,
          email: input.email,
          phone: input.phone,
          passwordHash: await hashPassword(input.password),
          roleId: role.id
        }
      })
      return tx.partnerStaff.create({
        data: {
          userId: user.id,
          partnerId: partner.id,
          assignments: { create: ids.map((branchId) => ({ branchId })) }
        },
        include: staffInclude
      })
    })
  },
  async update(ownerUserId: string, staffId: string, input: UpdateStaffInput) {
    const { partner, staff } = await ownedStaff(ownerUserId, staffId)
    const ids = input.branchIds ? await assertBranches(partner.id, input.branchIds) : undefined
    if (input.email || input.phone) {
      const duplicate = await prisma.user.findFirst({
        where: {
          id: { not: staff.userId },
          OR: [...(input.email ? [{ email: input.email }] : []), ...(input.phone ? [{ phone: input.phone }] : [])]
        }
      })
      if (duplicate) throw AppError.duplicate('Email hoặc số điện thoại đã được sử dụng')
    }
    return prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: staff.userId },
        data: {
          fullName: input.fullName,
          email: input.email,
          phone: input.phone,
          status: input.locked === undefined ? undefined : input.locked ? 'LOCKED' : 'ACTIVE',
          tokenVersion:
            input.locked === undefined && input.status === undefined && !input.password ? undefined : { increment: 1 },
          ...(input.password ? { passwordHash: await hashPassword(input.password) } : {})
        }
      })
      if (ids) {
        await tx.partnerStaffBranch.deleteMany({ where: { staffId } })
        await tx.partnerStaffBranch.createMany({ data: ids.map((branchId) => ({ staffId, branchId })) })
      }
      return tx.partnerStaff.update({ where: { id: staffId }, data: { status: input.status }, include: staffInclude })
    })
  }
}
