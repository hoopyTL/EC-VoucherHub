import 'dotenv/config'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import { PrismaClient } from '@prisma/client'
import { SEED_CATEGORY_NAMES, SEED_ROLES } from '../prisma/seed/constants'

const prisma = new PrismaClient()
const require = createRequire(import.meta.url)
const tsxCli = require.resolve('tsx/cli')

type SeedStep = {
  name: string
  script: string
}

const seedSteps: SeedStep[] = [
  { name: 'Tạo dữ liệu nền', script: '../prisma/seed.ts' },
  { name: 'Tạo đối tác marketplace', script: './seed-marketplace.ts' },
  { name: 'Tạo và cân bằng chi nhánh đối tác', script: './balance-partner-catalogue.ts' },
  { name: 'Tạo catalogue voucher', script: './seed-catalogue.ts' },
  { name: 'Tạo catalogue tìm kiếm đầy đủ', script: './seed-search-catalogue.ts' },
  { name: 'Tạo voucher mô phỏng bổ sung', script: './seed-mock-voucher.ts' },
  { name: 'Tạo dữ liệu vận hành quản trị', script: './seed-admin-operations.ts' },
  { name: 'Tạo dữ liệu thống kê kinh doanh', script: './seed-business-analytics.ts' }
]

function maskedDatabaseUrl(value: string): string {
  try {
    const url = new URL(value)
    if (url.password) url.password = '***'
    for (const key of [...url.searchParams.keys()]) {
      if (/password|secret|token|key/i.test(key)) url.searchParams.set(key, '***')
    }
    return url.toString()
  } catch {
    return '[DATABASE_URL không hợp lệ]'
  }
}

async function confirmDestructiveSeed(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error('Thiếu DATABASE_URL')

  console.log(`Database đích: ${maskedDatabaseUrl(databaseUrl)}`)
  console.log('CẢNH BÁO: bước đầu tiên sẽ xóa dữ liệu hiện có trong database đích.')

  if (process.env.CONFIRM_FULL_SEED === 'SEED') return

  if (!input.isTTY) {
    throw new Error('Từ chối seed: cần terminal tương tác hoặc CONFIRM_FULL_SEED=SEED.')
  }

  const prompt = createInterface({ input, output })
  const answer = await prompt.question('Nhập chính xác SEED để tiếp tục: ')
  prompt.close()
  if (answer !== 'SEED') throw new Error('Đã hủy seed, database không bị thay đổi.')
}

function runScriptStep(step: SeedStep, index: number): void {
  console.log(`\n[Bước ${index}/10] ${step.name}`)
  const scriptPath = fileURLToPath(new URL(step.script, import.meta.url))
  const result = spawnSync(process.execPath, [tsxCli, scriptPath], {
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    env: process.env,
    stdio: 'inherit'
  })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`Tiến trình kết thúc với mã ${result.status ?? 'không xác định'}`)
}

async function verifyRelations(): Promise<void> {
  console.log('\n[Bước 9/10] Kiểm tra tính toàn vẹn dữ liệu')
  const roles = await prisma.role.findMany({ where: { name: { in: Object.values(SEED_ROLES) } } })
  const categories = await prisma.category.findMany({ where: { name: { in: [...SEED_CATEGORY_NAMES] } } })
  const vouchersWithoutCategory = await prisma.voucherProduct.count({ where: { categoryId: null } })
  const approvedPartnersWithoutBranches = await prisma.partner.count({
    where: { approvalStatus: 'APPROVED', branches: { none: {} } }
  })

  const problems: string[] = []
  if (roles.length !== Object.keys(SEED_ROLES).length) problems.push('thiếu role chuẩn')
  const categoryNames = new Set(categories.map((category) => category.name))
  if (SEED_CATEGORY_NAMES.some((categoryName) => !categoryNames.has(categoryName)))
    problems.push('thiếu danh mục chuẩn')
  if (vouchersWithoutCategory > 0) problems.push(`${vouchersWithoutCategory} voucher chưa có danh mục`)
  if (approvedPartnersWithoutBranches > 0) {
    problems.push(`${approvedPartnersWithoutBranches} đối tác đã duyệt chưa có chi nhánh`)
  }
  if (problems.length) throw new Error(problems.join('; '))
  console.log('Quan hệ role, danh mục, đối tác, chi nhánh và voucher hợp lệ.')
}

async function verifyMinimumCounts(): Promise<void> {
  console.log('\n[Bước 10/10] Đếm và xác nhận ngưỡng dữ liệu')
  const rows = [
    { table: 'roles', count: await prisma.role.count(), minimum: 3 },
    { table: 'users', count: await prisma.user.count(), minimum: 0 },
    { table: 'partners', count: await prisma.partner.count(), minimum: 20 },
    { table: 'branches', count: await prisma.branch.count(), minimum: 0 },
    { table: 'categories', count: await prisma.category.count(), minimum: 7 },
    { table: 'voucher_products', count: await prisma.voucherProduct.count(), minimum: 900 },
    { table: 'orders', count: await prisma.order.count(), minimum: 80 },
    { table: 'payment_transactions', count: await prisma.paymentTransaction.count(), minimum: 0 },
    { table: 'issued_voucher_codes', count: await prisma.issuedVoucherCode.count(), minimum: 0 }
  ]
  console.table(rows)
  const belowMinimum = rows.filter((row) => row.minimum > 0 && row.count < row.minimum)
  if (belowMinimum.length) {
    throw new Error(`Không đạt ngưỡng: ${belowMinimum.map((row) => row.table).join(', ')}`)
  }
  console.log('Seed đầy đủ hoàn tất và đạt toàn bộ ngưỡng dữ liệu.')
}

async function main(): Promise<void> {
  await confirmDestructiveSeed()
  for (const [index, step] of seedSteps.entries()) {
    try {
      runScriptStep(step, index + 1)
    } catch (error) {
      console.error(`Lỗi ở bước ${index + 1}: ${step.name}`)
      throw error
    }
  }

  try {
    await verifyRelations()
  } catch (error) {
    console.error('Lỗi ở bước 9: Kiểm tra tính toàn vẹn dữ liệu')
    throw error
  }

  try {
    await verifyMinimumCounts()
  } catch (error) {
    console.error('Lỗi ở bước 10: Đếm và xác nhận ngưỡng dữ liệu')
    throw error
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
