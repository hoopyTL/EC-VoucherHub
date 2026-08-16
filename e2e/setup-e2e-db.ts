import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

import { E2E_PASSWORD, e2eUsers } from './fixtures/task004'

const prisma = new PrismaClient()

async function resetDatabase(): Promise<void> {
  await prisma.usageLog.deleteMany()
  await prisma.issuedVoucherCode.deleteMany()
  await prisma.orderItem.deleteMany()
  await prisma.order.deleteMany()
  await prisma.cartItem.deleteMany()
  await prisma.cart.deleteMany()
  await prisma.voucherProductBranch.deleteMany()
  await prisma.voucherProduct.deleteMany()
  await prisma.category.deleteMany()
  await prisma.branch.deleteMany()
  await prisma.partner.deleteMany()
  await prisma.user.deleteMany()
}

export async function setupE2eDatabase(): Promise<void> {
  await resetDatabase()

  await prisma.category.create({ data: { name: 'E2E Ẩm thực' } })

  const roles = new Map<string, number>()
  for (const name of ['ADMIN', 'PARTNER', 'CUSTOMER']) {
    const role = await prisma.role.upsert({ where: { name }, update: {}, create: { name } })
    roles.set(name, role.id)
  }

  const passwordHash = await bcrypt.hash(E2E_PASSWORD, 10)
  for (const user of Object.values(e2eUsers)) {
    const roleId = roles.get(user.role)
    if (!roleId) throw new Error(`Missing E2E role: ${user.role}`)
    const created = await prisma.user.create({
      data: { email: user.email, fullName: user.fullName, roleId, passwordHash }
    })
    if (user.role === 'PARTNER') {
      await prisma.partner.create({
        data: {
          ownerUserId: created.id,
          legalName: 'E2E Approved Partner',
          taxCode: 'E2E-APPROVED-001',
          representative: user.fullName,
          approvalStatus: 'APPROVED',
          branches: { create: { name: 'E2E Main Branch', address: '1 Test Street', region: 'Hà Nội' } }
        }
      })
    }
  }
}

export async function disconnectE2eDatabase(): Promise<void> {
  await prisma.$disconnect()
}
