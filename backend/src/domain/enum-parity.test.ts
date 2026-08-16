import { describe, expect, it } from 'vitest'
import * as Prisma from '@prisma/client'
import * as Shared from '@voucher/shared'

/**
 * Drift guard: the shared enums (@voucher/shared, the source of truth read by
 * backend + frontend) must stay byte-identical to the Prisma-generated enums
 * (schema.prisma → DB). Add a status to one side but not the other → this fails.
 * This is the ONE place that imports both. See ADR-008.
 */

type EnumObj = Record<string, string>

// Every status enum that exists in BOTH schema.prisma and @voucher/shared.
const ENUM_PAIRS: ReadonlyArray<readonly [string, EnumObj, EnumObj]> = [
  ['UserStatus', Shared.UserStatus, Prisma.UserStatus],
  ['ApprovalStatus', Shared.ApprovalStatus, Prisma.ApprovalStatus],
  ['OperatingStatus', Shared.OperatingStatus, Prisma.OperatingStatus],
  ['VoucherStatus', Shared.VoucherStatus, Prisma.VoucherStatus],
  ['OrderStatus', Shared.OrderStatus, Prisma.OrderStatus],
  ['VoucherCodeStatus', Shared.VoucherCodeStatus, Prisma.VoucherCodeStatus],
  ['UsageResult', Shared.UsageResult, Prisma.UsageResult]
]

describe('enum parity (shared ⇄ Prisma)', () => {
  it.each(ENUM_PAIRS)('%s has identical members in both sources', (_name, shared, prisma) => {
    // Same set of keys → no status added on only one side.
    expect(new Set(Object.keys(shared))).toEqual(new Set(Object.keys(prisma)))
    // Each member maps to the same string value (shared uses Prisma member NAME).
    for (const key of Object.keys(prisma)) {
      expect(shared[key]).toBe(prisma[key])
    }
  })
})
