import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

import { E2E_PASSWORD, e2eUsers } from './fixtures/task004'

const prisma = new PrismaClient()

async function resetUsers(): Promise<void> {
  await prisma.usageLog.deleteMany()
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
}

export async function setupTask004Database(): Promise<void> {
  await resetUsers()

  const roles = new Map<string, number>()
  for (const name of ['ADMIN', 'PARTNER', 'CUSTOMER']) {
    const role = await prisma.role.upsert({ where: { name }, update: {}, create: { name } })
    roles.set(name, role.id)
  }

  const passwordHash = await bcrypt.hash(E2E_PASSWORD, 10)
  for (const user of Object.values(e2eUsers)) {
    const roleId = roles.get(user.role)
    if (!roleId) throw new Error(`Missing E2E role: ${user.role}`)
    await prisma.user.create({
      data: { email: user.email, fullName: user.fullName, roleId, passwordHash }
    })
  }
}

export async function disconnectTask004Database(): Promise<void> {
  await prisma.$disconnect()
}
