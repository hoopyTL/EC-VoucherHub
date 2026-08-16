import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { OrderStatus, VoucherCodeStatus, VoucherStatus } from '@voucher/shared'
import { AppError } from '../utils/app-error'
import { assertTransition, canTransition, isTerminal, type StateMachine } from './state-machine'
import { orderTransitions, voucherCodeTransitions, voucherTransitions } from './transitions'

const NUM_RUNS = 100

const MACHINES: ReadonlyArray<readonly [string, StateMachine<string>, readonly string[]]> = [
  ['voucher', voucherTransitions, Object.values(VoucherStatus)],
  ['order', orderTransitions, Object.values(OrderStatus)],
  ['voucherCode', voucherCodeTransitions, Object.values(VoucherCodeStatus)]
]

// fast-check arbitrary over the states of one machine.
const stateOf = (states: readonly string[]) => fc.constantFrom(...states)

describe('state-machine engine', () => {
  describe.each(MACHINES)('%s machine', (entity, machine, states) => {
    const m = machine

    it(`Property: canTransition true ⟺ to is a declared edge of from [${entity}]`, () => {
      fc.assert(
        fc.property(stateOf(states), stateOf(states), (from, to) => {
          expect(canTransition(m, from, to)).toBe(m[from].includes(to))
        }),
        { numRuns: NUM_RUNS }
      )
    })

    it(`Property: assertTransition throws 422 exactly when canTransition is false [${entity}]`, () => {
      fc.assert(
        fc.property(stateOf(states), stateOf(states), (from, to) => {
          if (canTransition(m, from, to)) {
            expect(() => assertTransition(m, from, to, entity)).not.toThrow()
          } else {
            try {
              assertTransition(m, from, to, entity)
              expect.unreachable('expected assertTransition to throw')
            } catch (err) {
              expect(err).toBeInstanceOf(AppError)
              expect((err as AppError).statusCode).toBe(422)
            }
          }
        }),
        { numRuns: NUM_RUNS }
      )
    })

    it(`Property: a terminal state has no outgoing edge [${entity}]`, () => {
      fc.assert(
        fc.property(stateOf(states), stateOf(states), (from, to) => {
          if (isTerminal(m, from)) {
            expect(canTransition(m, from, to)).toBe(false)
          }
        }),
        { numRuns: NUM_RUNS }
      )
    })

    it(`no self-loop: a state never transitions to itself [${entity}]`, () => {
      for (const s of states) {
        expect(canTransition(m, s, s)).toBe(false)
      }
    })
  })
})

describe('transition tables — concrete edges', () => {
  it('voucher: valid happy path is allowed', () => {
    expect(canTransition(voucherTransitions, VoucherStatus.DRAFT, VoucherStatus.PENDING_REVIEW)).toBe(true)
    expect(canTransition(voucherTransitions, VoucherStatus.APPROVED, VoucherStatus.ON_SALE)).toBe(true)
    expect(canTransition(voucherTransitions, VoucherStatus.PAUSED, VoucherStatus.ON_SALE)).toBe(true)
  })

  it('voucher: skipping review is rejected', () => {
    expect(canTransition(voucherTransitions, VoucherStatus.DRAFT, VoucherStatus.ON_SALE)).toBe(false)
  })

  it('voucher: DISCONTINUED is terminal', () => {
    expect(isTerminal(voucherTransitions, VoucherStatus.DISCONTINUED)).toBe(true)
  })

  it('order: cannot revert PAID back to PENDING_PAYMENT', () => {
    expect(canTransition(orderTransitions, OrderStatus.PAID, OrderStatus.PENDING_PAYMENT)).toBe(false)
  })

  it('order: CANCELLED and REFUNDED are terminal', () => {
    expect(isTerminal(orderTransitions, OrderStatus.CANCELLED)).toBe(true)
    expect(isTerminal(orderTransitions, OrderStatus.REFUNDED)).toBe(true)
  })

  it('voucherCode: LOCKED can be unlocked back to UNUSED', () => {
    expect(canTransition(voucherCodeTransitions, VoucherCodeStatus.LOCKED, VoucherCodeStatus.UNUSED)).toBe(true)
  })

  it('voucherCode: USED cannot be reused', () => {
    expect(canTransition(voucherCodeTransitions, VoucherCodeStatus.USED, VoucherCodeStatus.UNUSED)).toBe(false)
    expect(isTerminal(voucherCodeTransitions, VoucherCodeStatus.USED)).toBe(true)
  })

  it('assertTransition throws AppError with from/to details on an invalid edge', () => {
    try {
      assertTransition(orderTransitions, OrderStatus.PAID, OrderStatus.PENDING_PAYMENT, 'order')
      expect.unreachable('expected throw')
    } catch (err) {
      expect(err).toBeInstanceOf(AppError)
      expect((err as AppError).statusCode).toBe(422)
      expect((err as AppError).details).toEqual({ from: OrderStatus.PAID, to: OrderStatus.PENDING_PAYMENT })
    }
  })
})
