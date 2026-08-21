import {
  ApprovalStatus,
  OperatingStatus,
  OrderStatus,
  Prisma,
  UsageResult,
  UserStatus,
  VoucherStatus,
  VoucherCodeStatus
} from '@prisma/client'
import prisma from '../configs/prisma'
import { badRequest, conflict, notFound } from '../errors/http-error'

const orderInclude = {
  customer: {
    select: {
      id: true,
      email: true,
      phone: true,
      fullName: true
    }
  },
  orderItems: {
    include: {
      voucherProduct: {
        select: {
          id: true,
          name: true,
          remainingQuantity: true,
          totalQuantity: true
        }
      }
    }
  },
  issuedVoucherCodes: {
    select: {
      id: true,
      code: true,
      status: true,
      remainingUses: true,
      expiresAt: true
    }
  }
} satisfies Prisma.OrderInclude

type ListOrdersQuery = {
  status?: string
  q?: string
  from?: string
  to?: string
  limit?: string
}

type ListQuery = {
  status?: string
  q?: string
  limit?: string
}

type ContentQuery = ListQuery & {
  type?: string
}

type ContentInput = {
  type?: unknown
  title?: unknown
  body?: unknown
  status?: unknown
  displayFrom?: unknown
  displayTo?: unknown
}

const contentTypes = ['banner', 'announcement', 'policy', 'faq'] as const
const contentStatuses = ['draft', 'published', 'archived'] as const

type AuditWriter = Pick<Prisma.TransactionClient, 'auditLog' | 'user'>

function toNumber(value: Prisma.Decimal | number) {
  return Number(value)
}

function parseOrderStatus(status?: string) {
  if (!status) return undefined
  const normalized = status.toUpperCase()
  if (!Object.values(OrderStatus).includes(normalized as OrderStatus)) {
    throw conflict(`Invalid order status: ${status}`)
  }
  return normalized as OrderStatus
}

function clampLimit(limit?: string) {
  return Math.min(Number(limit) || 100, 100)
}

async function resolveAdminActorId(actorEmail?: string, client: AuditWriter = prisma) {
  const email = actorEmail || 'admin@voucherhub.com'
  const actor = await client.user.findFirst({
    where: {
      email,
      role: { is: { name: 'QUAN_TRI_VIEN' } }
    },
    select: { id: true }
  })
  return actor?.id ?? null
}

async function writeAuditLog(
  client: AuditWriter,
  action: string,
  entityType: string,
  entityId: string | null,
  metadata?: Prisma.InputJsonValue,
  actorEmail?: string
) {
  const actorUserId = await resolveAdminActorId(actorEmail, client)
  await client.auditLog.create({
    data: {
      actorUserId,
      action,
      entityType,
      entityId,
      metadata
    }
  })
}

function stringValue(value: unknown, field: string) {
  if (typeof value !== 'string' || !value.trim()) throw badRequest(`${field} is required`)
  return value.trim()
}

function optionalDateValue(value: unknown, field: string) {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string') throw badRequest(`${field} must be an ISO date string`)
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) throw badRequest(`${field} must be a valid date`)
  return date
}

function normalizeContentInput(input: ContentInput, partial = false) {
  const data: {
    type?: string
    title?: string
    body?: string
    status?: string
    displayFrom?: Date | null
    displayTo?: Date | null
  } = {}

  if (!partial || input.type !== undefined) {
    const type = stringValue(input.type, 'type')
    if (!contentTypes.includes(type as (typeof contentTypes)[number])) throw badRequest('Loại nội dung không hợp lệ')
    data.type = type
  }
  if (!partial || input.title !== undefined) data.title = stringValue(input.title, 'title')
  if (!partial || input.body !== undefined) data.body = stringValue(input.body, 'body')
  if (!partial || input.status !== undefined) {
    const status = stringValue(input.status ?? 'draft', 'status').toLowerCase()
    if (!contentStatuses.includes(status as (typeof contentStatuses)[number]))
      throw badRequest('Trạng thái nội dung không hợp lệ')
    data.status = status
  }
  if (input.displayFrom !== undefined) data.displayFrom = optionalDateValue(input.displayFrom, 'displayFrom')
  if (input.displayTo !== undefined) data.displayTo = optionalDateValue(input.displayTo, 'displayTo')
  if (data.displayFrom && data.displayTo && data.displayFrom > data.displayTo) {
    throw badRequest('displayFrom must be before displayTo')
  }

  return data
}

function mapOrder(order: Prisma.OrderGetPayload<{ include: typeof orderInclude }>) {
  return {
    id: order.id,
    status: order.status,
    totalAmount: toNumber(order.totalAmount),
    paymentMethod: order.paymentMethod,
    paidAt: order.paidAt,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    customer: order.customer,
    items: order.orderItems.map((item) => ({
      id: item.id,
      voucherProductId: item.voucherProductId,
      voucherName: item.voucherProduct.name,
      quantity: item.quantity,
      unitPrice: toNumber(item.unitPrice),
      lineTotal: toNumber(item.unitPrice) * item.quantity,
      remainingQuantity: item.voucherProduct.remainingQuantity,
      totalQuantity: item.voucherProduct.totalQuantity
    })),
    codes: order.issuedVoucherCodes.map((code) => ({
      id: code.id,
      code: code.code,
      status: code.status,
      remainingUses: code.remainingUses,
      expiresAt: code.expiresAt
    }))
  }
}

export async function listAdminOrders(query: ListOrdersQuery) {
  const limit = Math.min(Number(query.limit) || 50, 100)
  const status = parseOrderStatus(query.status)

  const where: Prisma.OrderWhereInput = {
    ...(status ? { status } : {}),
    ...(query.from || query.to
      ? {
          createdAt: {
            ...(query.from ? { gte: new Date(query.from) } : {}),
            ...(query.to ? { lte: new Date(query.to) } : {})
          }
        }
      : {}),
    ...(query.q
      ? {
          customer: {
            OR: [
              { email: { contains: query.q, mode: 'insensitive' } },
              { phone: { contains: query.q } },
              { fullName: { contains: query.q, mode: 'insensitive' } }
            ]
          }
        }
      : {})
  }

  const orders = await prisma.order.findMany({
    where,
    include: orderInclude,
    orderBy: { createdAt: 'desc' },
    take: limit
  })

  return {
    items: orders.map(mapOrder),
    nextCursor: null
  }
}

export async function getAdminOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: orderInclude
  })

  if (!order) throw notFound('Không tìm thấy đơn hàng')
  return mapOrder(order)
}

export async function cancelAdminOrder(orderId: string, actorEmail?: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: orderInclude
    })

    if (!order) throw notFound('Không tìm thấy đơn hàng')
    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw conflict('Chỉ có thể hủy đơn hàng đang chờ thanh toán')
    }

    const updated = await tx.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.CANCELLED },
      include: orderInclude
    })

    await writeAuditLog(
      tx,
      'order.cancel',
      'order',
      orderId,
      { previousStatus: order.status, nextStatus: updated.status },
      actorEmail
    )

    return mapOrder(updated)
  })
}

export async function refundAdminOrder(orderId: string, actorEmail?: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: orderInclude
    })

    if (!order) throw notFound('Không tìm thấy đơn hàng')
    if (order.status !== OrderStatus.PAID) {
      throw conflict('Chỉ có thể hoàn tiền cho đơn hàng đã thanh toán')
    }

    const usedCodes = order.issuedVoucherCodes.filter((code) => code.status === VoucherCodeStatus.USED)
    if (usedCodes.length > 0) {
      throw conflict('Không thể hoàn tiền đơn hàng có mã voucher đã sử dụng', {
        usedCodes: usedCodes.map((code) => code.code)
      })
    }

    await Promise.all(
      order.orderItems.map((item) =>
        tx.voucherProduct.update({
          where: { id: item.voucherProductId },
          data: {
            remainingQuantity: {
              increment: item.quantity
            }
          }
        })
      )
    )

    await tx.issuedVoucherCode.updateMany({
      where: { orderId },
      data: { status: VoucherCodeStatus.CANCELLED }
    })

    const refunded = await tx.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.REFUNDED },
      include: orderInclude
    })

    await writeAuditLog(
      tx,
      'order.refund',
      'order',
      orderId,
      {
        previousStatus: order.status,
        nextStatus: refunded.status,
        restoredItems: order.orderItems.map((item) => ({
          voucherProductId: item.voucherProductId,
          quantity: item.quantity
        }))
      },
      actorEmail
    )

    return mapOrder(refunded)
  })
}

export async function getAdminDashboard() {
  const [
    users,
    partners,
    vouchers,
    orders,
    paidRevenue,
    issuedCodes,
    usedCodes,
    cancelledCodes,
    successfulRedemptions,
    contentItems,
    auditLogs,
    recentOrders,
    ordersByStatus,
    topVoucherRows
  ] = await Promise.all([
    prisma.user.count(),
    prisma.partner.count(),
    prisma.voucherProduct.count(),
    prisma.order.count(),
    prisma.order.aggregate({
      where: { status: OrderStatus.PAID },
      _sum: { totalAmount: true }
    }),
    prisma.issuedVoucherCode.count(),
    prisma.issuedVoucherCode.count({ where: { status: VoucherCodeStatus.USED } }),
    prisma.issuedVoucherCode.count({ where: { status: VoucherCodeStatus.CANCELLED } }),
    prisma.usageLog.count({ where: { result: UsageResult.SUCCESS } }),
    prisma.contentItem.count(),
    prisma.auditLog.count(),
    prisma.order.findMany({
      include: orderInclude,
      orderBy: { createdAt: 'desc' },
      take: 6
    }),
    prisma.order.groupBy({
      by: ['status'],
      _count: { _all: true }
    }),
    prisma.orderItem.groupBy({
      by: ['voucherProductId'],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5
    })
  ])

  const topVoucherIds = topVoucherRows.map((row) => row.voucherProductId)
  const topVouchers = await prisma.voucherProduct.findMany({
    where: { id: { in: topVoucherIds } },
    select: { id: true, name: true, partner: { select: { legalName: true } } }
  })

  const voucherById = new Map(topVouchers.map((voucher) => [voucher.id, voucher]))

  return {
    totals: {
      users,
      partners,
      vouchers,
      orders,
      paidRevenue: Number(paidRevenue._sum.totalAmount ?? 0),
      issuedCodes,
      usedCodes,
      cancelledCodes,
      successfulRedemptions,
      contentItems,
      auditLogs
    },
    ordersByStatus: ordersByStatus.map((row) => ({
      status: row.status,
      count: row._count._all
    })),
    topVouchers: topVoucherRows.map((row) => {
      const voucher = voucherById.get(row.voucherProductId)
      return {
        voucherProductId: row.voucherProductId,
        name: voucher?.name ?? 'Unknown voucher',
        partnerName: voucher?.partner.legalName ?? 'Unknown partner',
        soldQuantity: row._sum.quantity ?? 0
      }
    }),
    recentOrders: recentOrders.map(mapOrder)
  }
}

/** Dashboard contract consumed by the React administration workspace. */
export async function getAdminDashboardStats() {
  const now = new Date()
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startWeek = new Date(startToday)
  startWeek.setDate(startToday.getDate() - ((startToday.getDay() + 6) % 7))
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [revenueRows, statusRows, topRows, partners] = await Promise.all([
    prisma.order.findMany({ where: { status: OrderStatus.PAID }, select: { totalAmount: true, paidAt: true, createdAt: true } }),
    prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.orderItem.groupBy({ by: ['voucherProductId'], _sum: { quantity: true }, orderBy: { _sum: { quantity: 'desc' } }, take: 5 }),
    prisma.partner.findMany({
      select: {
        id: true,
        legalName: true,
        voucherProducts: {
          select: {
            orderItems: { select: { quantity: true, unitPrice: true, order: { select: { status: true } } } }
          }
        },
        _count: { select: { voucherProducts: true } }
      }
    })
  ])

  const sumSince = (from?: Date) => revenueRows.reduce((sum, row) => {
    const date = row.paidAt ?? row.createdAt
    return !from || date >= from ? sum + Number(row.totalAmount) : sum
  }, 0)
  const ids = topRows.map((row) => row.voucherProductId)
  const products = await prisma.voucherProduct.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, salePrice: true, partner: { select: { legalName: true } } }
  })
  const productMap = new Map(products.map((item) => [item.id, item]))
  const ordersByStatus = Object.fromEntries(Object.values(OrderStatus).map((status) => [status, 0]))
  for (const row of statusRows) ordersByStatus[row.status] = row._count._all

  return {
    revenue: { today: sumSince(startToday), thisWeek: sumSince(startWeek), thisMonth: sumSince(startMonth), total: sumSince() },
    ordersByStatus,
    topVouchers: topRows.map((row) => {
      const product = productMap.get(row.voucherProductId)
      return { voucherId: row.voucherProductId, title: product?.name ?? 'Voucher', soldQuantity: row._sum.quantity ?? 0, salePrice: Number(product?.salePrice ?? 0), partnerName: product?.partner.legalName ?? 'Đối tác' }
    }),
    partnerPerformance: partners.map((partner) => {
      const paidItems = partner.voucherProducts.flatMap((voucher) => voucher.orderItems).filter((item) => item.order.status === OrderStatus.PAID)
      return {
        partnerId: partner.id,
        businessName: partner.legalName,
        voucherCount: partner._count.voucherProducts,
        orderCount: paidItems.length,
        revenue: paidItems.reduce((sum, item) => sum + item.quantity * Number(item.unitPrice), 0)
      }
    }).sort((a, b) => b.revenue - a.revenue)
  }
}

export async function getAdminAnalytics(daysInput = 30) {
  const days = Math.max(7, Math.min(Number(daysInput) || 30, 365))
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - days + 1)
  const [orders, signups, categoryRows, totals] = await Promise.all([
    prisma.order.findMany({ where: { createdAt: { gte: start } }, select: { status: true, totalAmount: true, createdAt: true, paidAt: true } }),
    prisma.user.findMany({ where: { createdAt: { gte: start } }, select: { createdAt: true } }),
    prisma.orderItem.findMany({
      where: { order: { status: OrderStatus.PAID } },
      select: { quantity: true, unitPrice: true, voucherProduct: { select: { category: { select: { name: true } } } } }
    }),
    prisma.order.groupBy({ by: ['status'], _count: { _all: true } })
  ])
  const keys = Array.from({ length: days }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return date.toISOString().slice(0, 10)
  })
  const revenue = new Map(keys.map((key) => [key, { date: key, revenue: 0, orders: 0 }]))
  const signup = new Map(keys.map((key) => [key, { date: key, signups: 0 }]))
  for (const order of orders) {
    if (order.status !== OrderStatus.PAID) continue
    const point = revenue.get((order.paidAt ?? order.createdAt).toISOString().slice(0, 10))
    if (point) { point.revenue += Number(order.totalAmount); point.orders += 1 }
  }
  for (const user of signups) {
    const point = signup.get(user.createdAt.toISOString().slice(0, 10))
    if (point) point.signups += 1
  }
  const categories = new Map<string, { category: string; revenue: number; unitsSold: number }>()
  for (const item of categoryRows) {
    const name = item.voucherProduct.category?.name ?? 'Khác'
    const current = categories.get(name) ?? { category: name, revenue: 0, unitsSold: 0 }
    current.unitsSold += item.quantity
    current.revenue += item.quantity * Number(item.unitPrice)
    categories.set(name, current)
  }
  const count = (status: OrderStatus) => totals.find((row) => row.status === status)?._count._all ?? 0
  const created = totals.reduce((sum, row) => sum + row._count._all, 0)
  const paid = count(OrderStatus.PAID)
  return {
    windowDays: days,
    revenueSeries: [...revenue.values()],
    signupSeries: [...signup.values()],
    categoryBreakdown: [...categories.values()].sort((a, b) => b.revenue - a.revenue),
    funnel: { ordersCreated: created, ordersPaid: paid, ordersCancelled: count(OrderStatus.CANCELLED), paidConversionRate: created ? paid / created : 0 }
  }
}

export async function listAdminUsers(query: ListQuery) {
  const limit = clampLimit(query.limit)
  const status = query.status?.toUpperCase()
  const where: Prisma.UserWhereInput = {
    ...(status && Object.values(UserStatus).includes(status as UserStatus) ? { status: status as UserStatus } : {}),
    ...(query.q
      ? {
          OR: [
            { email: { contains: query.q, mode: 'insensitive' } },
            { phone: { contains: query.q } },
            { fullName: { contains: query.q, mode: 'insensitive' } }
          ]
        }
      : {})
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      email: true,
      phone: true,
      fullName: true,
      status: true,
      createdAt: true,
      role: { select: { name: true } },
      _count: { select: { orders: true, issuedVoucherCodes: true, usageLogs: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: limit
  })

  return {
    items: users.map((user) => ({
      id: user.id,
      email: user.email,
      phone: user.phone,
      fullName: user.fullName,
      status: user.status,
      roleName: user.role.name,
      orders: user._count.orders,
      issuedCodes: user._count.issuedVoucherCodes,
      usageLogs: user._count.usageLogs,
      createdAt: user.createdAt
    })),
    nextCursor: null
  }
}

export async function setAdminUserStatus(userId: string, status: UserStatus, actorEmail?: string) {
  const user = await prisma.$transaction(async (tx) => {
    const before = await tx.user.findUnique({
      where: { id: userId },
      select: { status: true }
    })
    if (!before) throw notFound('Không tìm thấy người dùng')

    const updated = await tx.user.update({
      where: { id: userId },
      data: { status },
      select: {
        id: true,
        email: true,
        phone: true,
        fullName: true,
        status: true,
        createdAt: true,
        role: { select: { name: true } }
      }
    })

    await writeAuditLog(
      tx,
      status === UserStatus.LOCKED ? 'user.lock' : 'user.unlock',
      'user',
      userId,
      { previousStatus: before.status, nextStatus: updated.status },
      actorEmail
    )

    return updated
  })

  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    fullName: user.fullName,
    status: user.status,
    roleName: user.role.name,
    createdAt: user.createdAt
  }
}

export async function listAdminPartners(query: ListQuery) {
  const limit = clampLimit(query.limit)
  const status = query.status?.toUpperCase()
  const where: Prisma.PartnerWhereInput = {
    ...(status && Object.values(ApprovalStatus).includes(status as ApprovalStatus)
      ? { approvalStatus: status as ApprovalStatus }
      : {}),
    ...(query.q
      ? {
          OR: [
            { legalName: { contains: query.q, mode: 'insensitive' } },
            { taxCode: { contains: query.q, mode: 'insensitive' } },
            { representative: { contains: query.q, mode: 'insensitive' } },
            { owner: { is: { fullName: { contains: query.q, mode: 'insensitive' } } } }
          ]
        }
      : {})
  }

  const partners = await prisma.partner.findMany({
    where,
    include: {
      owner: { select: { email: true, phone: true, fullName: true } },
      _count: { select: { branches: true, voucherProducts: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: limit
  })

  return {
    items: partners.map((partner) => ({
      id: partner.id,
      legalName: partner.legalName,
      taxCode: partner.taxCode,
      representative: partner.representative,
      approvalStatus: partner.approvalStatus,
      operatingStatus: partner.operatingStatus,
      rejectReason: partner.rejectReason,
      owner: partner.owner,
      branches: partner._count.branches,
      vouchers: partner._count.voucherProducts,
      createdAt: partner.createdAt
    })),
    nextCursor: null
  }
}

export async function setAdminPartnerApproval(
  partnerId: string,
  approvalStatus: ApprovalStatus,
  rejectReason?: string,
  actorEmail?: string
) {
  return prisma.$transaction(async (tx) => {
    const before = await tx.partner.findUnique({
      where: { id: partnerId },
      select: { approvalStatus: true }
    })
    if (!before) throw notFound('Không tìm thấy đối tác')

    const partner = await tx.partner.update({
      where: { id: partnerId },
      data: {
        approvalStatus,
        rejectReason: approvalStatus === ApprovalStatus.REJECTED ? (rejectReason ?? 'Rejected by admin') : null
      }
    })

    await writeAuditLog(
      tx,
      approvalStatus === ApprovalStatus.APPROVED ? 'partner.approve' : 'partner.reject',
      'partner',
      partnerId,
      { previousStatus: before.approvalStatus, nextStatus: partner.approvalStatus },
      actorEmail
    )

    return partner
  })
}

export async function setAdminPartnerOperatingStatus(
  partnerId: string,
  operatingStatus: OperatingStatus,
  actorEmail?: string
) {
  return prisma.$transaction(async (tx) => {
    const before = await tx.partner.findUnique({
      where: { id: partnerId },
      select: { operatingStatus: true }
    })
    if (!before) throw notFound('Không tìm thấy đối tác')

    const partner = await tx.partner.update({
      where: { id: partnerId },
      data: { operatingStatus }
    })

    await writeAuditLog(
      tx,
      operatingStatus === OperatingStatus.SUSPENDED ? 'partner.suspend' : 'partner.activate',
      'partner',
      partnerId,
      { previousStatus: before.operatingStatus, nextStatus: partner.operatingStatus },
      actorEmail
    )

    return partner
  })
}

export async function listAdminVouchers(query: ListQuery) {
  const limit = clampLimit(query.limit)
  const status = query.status?.toUpperCase()
  const where: Prisma.VoucherProductWhereInput = {
    ...(status && Object.values(VoucherStatus).includes(status as VoucherStatus)
      ? { status: status as VoucherStatus }
      : {}),
    ...(query.q
      ? {
          OR: [
            { name: { contains: query.q, mode: 'insensitive' } },
            { description: { contains: query.q, mode: 'insensitive' } },
            { partner: { is: { legalName: { contains: query.q, mode: 'insensitive' } } } }
          ]
        }
      : {})
  }

  const vouchers = await prisma.voucherProduct.findMany({
    where,
    include: {
      partner: { select: { legalName: true, approvalStatus: true, operatingStatus: true } },
      category: { select: { name: true } },
      _count: { select: { orderItems: true, issuedVoucherCodes: true, voucherProductBranches: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: limit
  })

  return {
    items: vouchers.map((voucher) => ({
      id: voucher.id,
      name: voucher.name,
      description: voucher.description,
      partnerName: voucher.partner.legalName,
      partnerApprovalStatus: voucher.partner.approvalStatus,
      partnerOperatingStatus: voucher.partner.operatingStatus,
      categoryName: voucher.category?.name ?? null,
      originalPrice: toNumber(voucher.originalPrice),
      salePrice: toNumber(voucher.salePrice),
      remainingQuantity: voucher.remainingQuantity,
      totalQuantity: voucher.totalQuantity,
      status: voucher.status,
      rejectReason: voucher.rejectReason,
      saleStart: voucher.saleStart,
      saleEnd: voucher.saleEnd,
      usageStart: voucher.usageStart,
      usageEnd: voucher.usageEnd,
      orders: voucher._count.orderItems,
      issuedCodes: voucher._count.issuedVoucherCodes,
      branches: voucher._count.voucherProductBranches,
      createdAt: voucher.createdAt
    })),
    nextCursor: null
  }
}

export async function setAdminVoucherApproval(
  voucherId: string,
  status: VoucherStatus,
  rejectReason?: string,
  actorEmail?: string
) {
  const allowedStatuses: readonly VoucherStatus[] = [VoucherStatus.APPROVED, VoucherStatus.REJECTED]
  if (!allowedStatuses.includes(status)) {
    throw conflict('Trạng thái duyệt voucher phải là đã duyệt hoặc đã từ chối')
  }

  return prisma.$transaction(async (tx) => {
    const before = await tx.voucherProduct.findUnique({
      where: { id: voucherId },
      select: { status: true }
    })
    if (!before) throw notFound('Không tìm thấy voucher')

    const voucher = await tx.voucherProduct.update({
      where: { id: voucherId },
      data: {
        status,
        rejectReason: status === VoucherStatus.REJECTED ? (rejectReason ?? 'Rejected by admin') : null
      }
    })

    await writeAuditLog(
      tx,
      status === VoucherStatus.APPROVED ? 'voucher.approve' : 'voucher.reject',
      'voucher_product',
      voucherId,
      { previousStatus: before.status, nextStatus: voucher.status },
      actorEmail
    )

    return voucher
  })
}

export async function setAdminVoucherStatus(voucherId: string, status: VoucherStatus, actorEmail?: string) {
  const allowedStatuses: readonly VoucherStatus[] = [
    VoucherStatus.ON_SALE,
    VoucherStatus.PAUSED,
    VoucherStatus.DISCONTINUED
  ]
  if (!allowedStatuses.includes(status)) {
    throw conflict('Thao tác trạng thái voucher không được hỗ trợ')
  }

  return prisma.$transaction(async (tx) => {
    const before = await tx.voucherProduct.findUnique({
      where: { id: voucherId },
      select: { status: true }
    })
    if (!before) throw notFound('Không tìm thấy voucher')

    const voucher = await tx.voucherProduct.update({
      where: { id: voucherId },
      data: { status }
    })

    await writeAuditLog(
      tx,
      status === VoucherStatus.ON_SALE
        ? 'voucher.publish'
        : status === VoucherStatus.PAUSED
          ? 'voucher.pause'
          : 'voucher.discontinue',
      'voucher_product',
      voucherId,
      { previousStatus: before.status, nextStatus: voucher.status },
      actorEmail
    )

    return voucher
  })
}

export async function listAdminIssuedCodes(query: ListQuery) {
  const limit = clampLimit(query.limit)
  const status = query.status?.toUpperCase()
  const where: Prisma.IssuedVoucherCodeWhereInput = {
    ...(status && Object.values(VoucherCodeStatus).includes(status as VoucherCodeStatus)
      ? { status: status as VoucherCodeStatus }
      : {}),
    ...(query.q
      ? {
          OR: [
            { code: { contains: query.q, mode: 'insensitive' } },
            { owner: { is: { fullName: { contains: query.q, mode: 'insensitive' } } } },
            { voucherProduct: { is: { name: { contains: query.q, mode: 'insensitive' } } } }
          ]
        }
      : {})
  }

  const codes = await prisma.issuedVoucherCode.findMany({
    where,
    include: {
      owner: { select: { email: true, phone: true, fullName: true } },
      voucherProduct: { select: { name: true, partner: { select: { legalName: true } } } },
      order: { select: { status: true, totalAmount: true } }
    },
    orderBy: { issuedAt: 'desc' },
    take: limit
  })

  return {
    items: codes.map((code) => ({
      id: code.id,
      code: code.code,
      status: code.status,
      remainingUses: code.remainingUses,
      issuedAt: code.issuedAt,
      expiresAt: code.expiresAt,
      orderId: code.orderId,
      orderStatus: code.order.status,
      orderTotalAmount: toNumber(code.order.totalAmount),
      owner: code.owner,
      voucherName: code.voucherProduct.name,
      partnerName: code.voucherProduct.partner.legalName
    })),
    nextCursor: null
  }
}

export async function listAdminUsageLogs(query: ListQuery) {
  const limit = clampLimit(query.limit)
  const logs = await prisma.usageLog.findMany({
    where: query.q
      ? {
          OR: [
            { issuedCode: { is: { code: { contains: query.q, mode: 'insensitive' } } } },
            { actor: { is: { fullName: { contains: query.q, mode: 'insensitive' } } } },
            { branch: { is: { name: { contains: query.q, mode: 'insensitive' } } } }
          ]
        }
      : {},
    include: {
      issuedCode: {
        select: {
          code: true,
          status: true,
          voucherProduct: { select: { name: true } }
        }
      },
      branch: { select: { name: true, region: true, partner: { select: { legalName: true } } } },
      actor: { select: { email: true, phone: true, fullName: true } }
    },
    orderBy: { usedAt: 'desc' },
    take: limit
  })

  return {
    items: logs.map((log) => ({
      id: log.id,
      result: log.result,
      usedAt: log.usedAt,
      code: log.issuedCode.code,
      codeStatus: log.issuedCode.status,
      voucherName: log.issuedCode.voucherProduct.name,
      branchName: log.branch.name,
      branchRegion: log.branch.region,
      partnerName: log.branch.partner.legalName,
      actor: log.actor
    })),
    nextCursor: null
  }
}

export async function listAdminContent(query: ContentQuery) {
  const limit = clampLimit(query.limit)
  const type = query.type?.toLowerCase()
  const status = query.status?.toLowerCase()

  const items = await prisma.contentItem.findMany({
    where: {
      ...(type && contentTypes.includes(type as (typeof contentTypes)[number]) ? { type } : {}),
      ...(status && contentStatuses.includes(status as (typeof contentStatuses)[number]) ? { status } : {}),
      ...(query.q
        ? {
            OR: [
              { title: { contains: query.q, mode: 'insensitive' } },
              { body: { contains: query.q, mode: 'insensitive' } }
            ]
          }
        : {})
    },
    include: {
      author: { select: { email: true, phone: true, fullName: true } }
    },
    orderBy: { updatedAt: 'desc' },
    take: limit
  })

  return {
    items: items.map((item) => ({
      id: item.id,
      type: item.type,
      title: item.title,
      body: item.body,
      status: item.status,
      displayFrom: item.displayFrom,
      displayTo: item.displayTo,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      author: item.author
    })),
    nextCursor: null
  }
}

export async function createAdminContent(input: ContentInput, actorEmail?: string) {
  const data = normalizeContentInput(input)
  const actorUserId = await resolveAdminActorId(actorEmail)
  if (!actorUserId) throw conflict('Không tìm thấy tài khoản quản trị. Vui lòng tạo admin@voucherhub.com trước.')

  return prisma.$transaction(async (tx) => {
    const item = await tx.contentItem.create({
      data: {
        type: data.type!,
        title: data.title!,
        body: data.body!,
        status: data.status!,
        displayFrom: data.displayFrom,
        displayTo: data.displayTo,
        authorUserId: actorUserId
      },
      include: { author: { select: { email: true, phone: true, fullName: true } } }
    })

    await writeAuditLog(
      tx,
      'content.create',
      'content_item',
      item.id,
      { title: item.title, type: item.type, status: item.status },
      actorEmail
    )

    return item
  })
}

export async function updateAdminContent(contentId: string, input: ContentInput, actorEmail?: string) {
  const data = normalizeContentInput(input, true)
  if (!Object.keys(data).length) throw badRequest('Không có trường nội dung nào để cập nhật')

  return prisma.$transaction(async (tx) => {
    const before = await tx.contentItem.findUnique({
      where: { id: contentId },
      select: { status: true, title: true, type: true }
    })
    if (!before) throw notFound('Không tìm thấy nội dung')

    const item = await tx.contentItem.update({
      where: { id: contentId },
      data,
      include: { author: { select: { email: true, phone: true, fullName: true } } }
    })

    await writeAuditLog(
      tx,
      'content.update',
      'content_item',
      item.id,
      {
        previousStatus: before.status,
        nextStatus: item.status,
        previousTitle: before.title,
        nextTitle: item.title
      },
      actorEmail
    )

    return item
  })
}

export async function archiveAdminContent(contentId: string, actorEmail?: string) {
  return prisma.$transaction(async (tx) => {
    const before = await tx.contentItem.findUnique({
      where: { id: contentId },
      select: { status: true, title: true, type: true }
    })
    if (!before) throw notFound('Không tìm thấy nội dung')

    const item = await tx.contentItem.update({
      where: { id: contentId },
      data: { status: 'archived' },
      include: { author: { select: { email: true, phone: true, fullName: true } } }
    })

    await writeAuditLog(
      tx,
      'content.archive',
      'content_item',
      item.id,
      { previousStatus: before.status, nextStatus: item.status, title: item.title },
      actorEmail
    )

    return item
  })
}

export async function listAdminAuditLogs(query: ListQuery & { action?: string; entityType?: string }) {
  const limit = clampLimit(query.limit)
  const logs = await prisma.auditLog.findMany({
    where: {
      ...(query.action ? { action: { contains: query.action, mode: 'insensitive' } } : {}),
      ...(query.entityType ? { entityType: { contains: query.entityType, mode: 'insensitive' } } : {}),
      ...(query.q
        ? {
            OR: [
              { action: { contains: query.q, mode: 'insensitive' } },
              { entityType: { contains: query.q, mode: 'insensitive' } },
              { entityId: { contains: query.q, mode: 'insensitive' } },
              { actor: { is: { fullName: { contains: query.q, mode: 'insensitive' } } } },
              { actor: { is: { email: { contains: query.q, mode: 'insensitive' } } } }
            ]
          }
        : {})
    },
    include: {
      actor: { select: { email: true, phone: true, fullName: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: limit
  })

  return {
    items: logs.map((log) => ({
      id: log.id,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      metadata: log.metadata,
      createdAt: log.createdAt,
      actor: log.actor
    })),
    nextCursor: null
  }
}
