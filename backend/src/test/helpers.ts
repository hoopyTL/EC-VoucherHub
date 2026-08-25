import { RoleName, type RoleName as RoleNameValue } from '@voucher/shared'
import prisma from '~/configs/prisma'
import { signAccessToken } from '~/utils/jwt'
import { hashPassword } from '~/utils/password'

export const TEST_PASSWORD = 'ValidPassword123!'

export async function seedRoles(): Promise<void> {
  await Promise.all(
    Object.values(RoleName).map((name) => prisma.role.upsert({ where: { name }, update: {}, create: { name } }))
  )
}

export async function resetUsers(): Promise<void> {
  await prisma.review.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.contentItem.deleteMany()
  await prisma.usageLog.deleteMany()
  await prisma.partnerStaffBranch.deleteMany()
  await prisma.partnerStaff.deleteMany()
  await prisma.issuedVoucherCode.deleteMany()
  await prisma.orderItem.deleteMany()
  await prisma.order.deleteMany()
  await prisma.cartItem.deleteMany()
  await prisma.cart.deleteMany()
  await prisma.voucherProductBranch.deleteMany()
  await prisma.voucherProduct.deleteMany()
  await prisma.branch.deleteMany()
  await prisma.partner.deleteMany()
  await prisma.user.deleteMany()
  // Keep role rows intact for tests — `seedRoles` seeds them as needed.
}

interface CreateUserOptions {
  email: string
  role?: RoleNameValue
  password?: string
  status?: 'ACTIVE' | 'LOCKED'
  fullName?: string
}

export async function createUser({
  email,
  role = RoleName.CUSTOMER,
  password = TEST_PASSWORD,
  status = 'ACTIVE',
  fullName = 'Test User'
}: CreateUserOptions) {
  const dbRole = await prisma.role.findUniqueOrThrow({ where: { name: role } })
  return prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword(password),
      roleId: dbRole.id,
      status,
      fullName
    }
  })
}

export function authHeader(userId: string, role: RoleNameValue = RoleName.CUSTOMER) {
  return { Authorization: `Bearer ${signAccessToken({ sub: userId, role })}` }
}
