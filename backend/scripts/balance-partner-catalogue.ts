import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const catalogue = [
  ['owner@phuclong.vn', 'Phúc Long Heritage', 'VH-PHUCLONG-2026', 'Nguyễn Hải An'],
  ['owner@pizza4ps.vn', "Pizza 4P's Việt Nam", 'VH-PIZZA4PS-2026', 'Trần Minh Khoa'],
  ['owner@seoulspa.vn', 'Seoul Center Spa', 'VH-SEOULSPA-2026', 'Lê Thảo Nhi'],
  ['owner@vinpearl.vn', 'Vinpearl Hospitality', 'VH-VINPEARL-2026', 'Phạm Quốc Bảo'],
  ['owner@cgv.vn', 'CGV Cinemas Việt Nam', 'VH-CGV-2026', 'Võ Thanh Tùng'],
  ['owner@techzone.vn', 'TechZone Retail', 'VH-TECHZONE-2026', 'Đặng Khánh Linh']
] as const
const branchSeeds = [
  ['Trung tâm Hà Nội', '18 Tràng Tiền, Hoàn Kiếm', 'Hà Nội'],
  ['Trung tâm TP. Hồ Chí Minh', '72 Nguyễn Huệ, Quận 1', 'TP. Hồ Chí Minh'],
  ['Trung tâm Đà Nẵng', '36 Bạch Đằng, Hải Châu', 'Đà Nẵng']
] as const

async function main() {
  const role = await prisma.role.findFirstOrThrow({ where: { name: { in: ['PARTNER', 'DOI_TAC'] } } })
  const passwordHash = await bcrypt.hash('12345678', 10)
  for (const [email, legalName, taxCode, representative] of catalogue) {
    const user = await prisma.user.upsert({
      where: { email },
      update: { fullName: representative, passwordHash, status: 'ACTIVE', roleId: role.id },
      create: { email, fullName: representative, passwordHash, status: 'ACTIVE', roleId: role.id }
    })
    const byOwner = await prisma.partner.findUnique({ where: { ownerUserId: user.id } })
    const partner = byOwner
      ? await prisma.partner.update({
          where: { id: byOwner.id },
          data: { legalName, representative, approvalStatus: 'APPROVED', operatingStatus: 'ACTIVE' }
        })
      : await prisma.partner.create({
          data: {
            ownerUserId: user.id,
            legalName,
            taxCode,
            representative,
            approvalStatus: 'APPROVED',
            operatingStatus: 'ACTIVE'
          }
        })
    for (const [suffix, address, region] of branchSeeds) {
      const name = `${legalName} · ${suffix}`
      const existing = await prisma.branch.findFirst({ where: { partnerId: partner.id, region } })
      if (existing) await prisma.branch.update({ where: { id: existing.id }, data: { name, address, region } })
      else await prisma.branch.create({ data: { partnerId: partner.id, name, address, region } })
    }
  }

  // Make every existing partner login deterministic and every business usable.
  await prisma.user.updateMany({
    where: { role: { name: { in: ['PARTNER', 'DOI_TAC'] } } },
    data: { passwordHash, status: 'ACTIVE', roleId: role.id }
  })
  await prisma.partner.updateMany({
    data: { approvalStatus: 'APPROVED', operatingStatus: 'ACTIVE', rejectReason: null }
  })

  const partners = await prisma.partner.findMany({
    include: { branches: true, owner: true },
    orderBy: { legalName: 'asc' }
  })
  for (const partner of partners) {
    for (const [suffix, address, region] of branchSeeds) {
      if (!partner.branches.some((branch) => branch.region === region)) {
        await prisma.branch.create({
          data: { partnerId: partner.id, name: `${partner.legalName} · ${suffix}`, address, region }
        })
      }
    }
  }

  const refreshed = await prisma.partner.findMany({ include: { branches: true } })
  const byName = new Map(refreshed.map((partner) => [partner.legalName, partner]))
  const pools: Record<string, string[]> = {
    'Cà phê & Trà sữa': ['CÔNG TY CỔ PHẦN DỊCH VỤ CÀ PHÊ CAO NGUYÊN', 'Highlands Coffee Demo', 'Phúc Long Heritage'],
    'Ăn uống': ['Golden Gate Restaurant Group', "Pizza 4P's Việt Nam"],
    'Buffet & Lẩu': ['Golden Gate Restaurant Group', "Pizza 4P's Việt Nam"],
    'Làm đẹp & Spa': ['Lotus Wellness & Spa', 'Seoul Center Spa'],
    'Du lịch & Khách sạn': ['TripGo Việt Nam', 'Vinpearl Hospitality'],
    'Giải trí': ['Starlight Entertainment', 'CGV Cinemas Việt Nam'],
    'Mua sắm': ['ReadMore Lifestyle', 'TechZone Retail']
  }
  const vouchers = await prisma.voucherProduct.findMany({ include: { category: true }, orderBy: { name: 'asc' } })
  const counters = new Map<string, number>()
  for (const voucher of vouchers) {
    const category = voucher.category?.name ?? 'Mua sắm'
    const pool = (pools[category] ?? pools['Mua sắm']).map((name) => byName.get(name)).filter(Boolean)
    if (!pool.length) continue
    const index = counters.get(category) ?? 0
    const partner = pool[index % pool.length]!
    counters.set(category, index + 1)
    await prisma.$transaction([
      prisma.voucherProduct.update({
        where: { id: voucher.id },
        data: {
          partnerId: partner.id,
          description: `${voucher.name} do ${partner.legalName} cung cấp. Áp dụng tại hệ thống chi nhánh tham gia trên toàn quốc.`
        }
      }),
      prisma.voucherProductBranch.deleteMany({ where: { voucherProductId: voucher.id } }),
      prisma.voucherProductBranch.createMany({
        data: partner.branches.map((branch) => ({ voucherProductId: voucher.id, branchId: branch.id })),
        skipDuplicates: true
      })
    ])
  }

  const summary = await prisma.partner.findMany({
    include: { owner: { select: { email: true } }, _count: { select: { branches: true, voucherProducts: true } } },
    orderBy: { legalName: 'asc' }
  })
  console.table(
    summary.map((partner) => ({
      partner: partner.legalName,
      email: partner.owner.email,
      branches: partner._count.branches,
      vouchers: partner._count.voucherProducts
    }))
  )
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
