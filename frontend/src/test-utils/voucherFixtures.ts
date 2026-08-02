/**
 * Shared test fixtures for the voucher catalogue pages/components.
 */
import { VoucherStatus } from '@ui-contracts'
import type { VoucherDetailResponse, VoucherListItem } from '../services/voucher.service'

/** Builds a voucher list item with sensible defaults, overridable per-test. */
export function makeVoucher(overrides: Partial<VoucherListItem> = {}): VoucherListItem {
  return {
    id: 'v1',
    title: 'Spa Day Package',
    description: 'A relaxing full-day spa experience.',
    category: 'Spa & Beauty',
    originalPrice: '200000.00',
    salePrice: '150000.00',
    totalQuantity: 100,
    soldQuantity: 40,
    salePeriodStart: '2025-01-01T00:00:00.000Z',
    salePeriodEnd: '2025-12-31T00:00:00.000Z',
    usagePeriodStart: '2025-01-01T00:00:00.000Z',
    usagePeriodEnd: '2026-01-31T00:00:00.000Z',
    terms: 'Valid on weekdays only.',
    imageUrl: null,
    status: VoucherStatus.APPROVED,
    partnerId: 'p1',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    partner: { businessName: 'Serenity Spa' },
    voucherBranches: [
      {
        id: 'vb1',
        voucherId: 'v1',
        branchId: 'b1',
        branch: {
          id: 'b1',
          name: 'Serenity Downtown',
          address: '123 Lê Lợi',
          region: 'TP. Hồ Chí Minh',
          contact: '0900000000',
          isActive: true
        }
      }
    ],
    ...overrides
  }
}

/** Builds a voucher detail response (list item + derived fields). */
export function makeVoucherDetail(overrides: Partial<VoucherDetailResponse> = {}): VoucherDetailResponse {
  const base = makeVoucher(overrides as Partial<VoucherListItem>)
  return {
    ...base,
    remainingQuantity: base.totalQuantity - base.soldQuantity,
    discountPercentage: 25,
    ...overrides
  }
}
