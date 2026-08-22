import prisma from '../../configs/prisma'
import type { Prisma } from '@prisma/client'
import type { Decimal } from '@prisma/client/runtime/library'

// ─── Types ──────────────────────────────────────────────────────────

export interface CreatePaymentDto {
  orderId: string
  gateway: string // VNPAY | STRIPE | SIMULATE
  amount: Decimal | number
  currency?: string // VND, USD...
}

export interface UpdatePaymentDto {
  status: 'SUCCESS' | 'FAILED' | 'REFUNDED'
  gatewayTransId?: string
  rawResponse?: Record<string, unknown>
  failureReason?: string
  paidAt?: Date
  refundedAt?: Date
}

export interface PaymentTransactionResponse {
  id: string
  orderId: string
  gateway: string
  gatewayTransId: string | null
  amount: string
  currency: string
  status: string
  failureReason: string | null
  paidAt: string | null
  refundedAt: string | null
  createdAt: string
}

// ─── Helper ─────────────────────────────────────────────────────────

const toResponse = (pt: {
  id: string
  orderId: string
  gateway: string
  gatewayTransId: string | null
  amount: Decimal
  currency: string
  status: string
  rawResponse: Prisma.JsonValue
  failureReason: string | null
  paidAt: Date | null
  refundedAt: Date | null
  createdAt: Date
}): PaymentTransactionResponse => ({
  id: pt.id,
  orderId: pt.orderId,
  gateway: pt.gateway,
  gatewayTransId: pt.gatewayTransId,
  amount: pt.amount.toFixed(2),
  currency: pt.currency,
  status: pt.status,
  failureReason: pt.failureReason,
  paidAt: pt.paidAt?.toISOString() ?? null,
  refundedAt: pt.refundedAt?.toISOString() ?? null,
  createdAt: pt.createdAt.toISOString()
})

// ─── Service ────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPrismaClient = any

export const paymentService = {
  /**
   * Tạo bản ghi thanh toán mới (trạng thái PENDING).
   * Có thể gọi bên trong transaction Prisma (truyền `tx`) hoặc gọi độc lập.
   */
  async create(dto: CreatePaymentDto, tx?: AnyPrismaClient) {
    const client = tx ?? prisma
    return client.paymentTransaction.create({
      data: {
        orderId: dto.orderId,
        gateway: dto.gateway,
        amount: dto.amount,
        currency: dto.currency ?? 'VND',
        status: 'PENDING'
      }
    })
  },

  /**
   * Cập nhật trạng thái giao dịch thanh toán (SUCCESS / FAILED / REFUNDED).
   */
  async updateStatus(paymentId: string, dto: UpdatePaymentDto, tx?: AnyPrismaClient) {
    const client = tx ?? prisma
    return client.paymentTransaction.update({
      where: { id: paymentId },
      data: {
        status: dto.status,
        gatewayTransId: dto.gatewayTransId,
        rawResponse: dto.rawResponse as Prisma.JsonObject | undefined,
        failureReason: dto.failureReason,
        paidAt: dto.paidAt,
        refundedAt: dto.refundedAt
      }
    })
  },

  /**
   * Lấy toàn bộ lịch sử thanh toán của một đơn hàng.
   */
  async getByOrderId(orderId: string): Promise<PaymentTransactionResponse[]> {
    const records = await prisma.paymentTransaction.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' }
    })
    return records.map(toResponse)
  },

  /**
   * Tìm giao dịch theo mã giao dịch từ cổng thanh toán.
   */
  async getByGatewayTransId(gatewayTransId: string): Promise<PaymentTransactionResponse | null> {
    const record = await prisma.paymentTransaction.findFirst({
      where: { gatewayTransId }
    })
    return record ? toResponse(record) : null
  },

  /**
   * Lấy giao dịch thành công gần nhất của đơn hàng.
   */
  async getSuccessfulPayment(orderId: string): Promise<PaymentTransactionResponse | null> {
    const record = await prisma.paymentTransaction.findFirst({
      where: { orderId, status: 'SUCCESS' },
      orderBy: { createdAt: 'desc' }
    })
    return record ? toResponse(record) : null
  }
}
