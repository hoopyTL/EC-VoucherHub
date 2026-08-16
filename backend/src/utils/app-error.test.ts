import { describe, it, expect } from 'vitest'
import { AppError } from './app-error'
import { ErrorCode } from './error-codes'

describe('AppError', () => {
  it('creates with correct properties', () => {
    const err = new AppError('test', 400, ErrorCode.BAD_REQUEST, { field: 'x' })

    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(AppError)
    expect(err.message).toBe('test')
    expect(err.statusCode).toBe(400)
    expect(err.code).toBe('BAD_REQUEST')
    expect(err.details).toEqual({ field: 'x' })
  })

  it('details is optional', () => {
    const err = new AppError('test', 400, ErrorCode.BAD_REQUEST)
    expect(err.details).toBeUndefined()
  })
})

describe('AppError factory methods', () => {
  it('.badRequest()', () => {
    const err = AppError.badRequest('oops', { field: 'a' })
    expect(err.statusCode).toBe(400)
    expect(err.code).toBe('BAD_REQUEST')
    expect(err.message).toBe('oops')
    expect(err.details).toEqual({ field: 'a' })
  })

  it('.badRequest() with defaults', () => {
    const err = AppError.badRequest()
    expect(err.message).toBe('Bad request')
  })

  it('.validation()', () => {
    const err = AppError.validation('fail', [{ field: 'email' }])
    expect(err.statusCode).toBe(400)
    expect(err.code).toBe('VALIDATION_ERROR')
    expect(err.details).toEqual([{ field: 'email' }])
  })

  it('.unauthorized()', () => {
    const err = AppError.unauthorized()
    expect(err.statusCode).toBe(401)
    expect(err.code).toBe('UNAUTHORIZED')
  })

  it('.forbidden()', () => {
    const err = AppError.forbidden()
    expect(err.statusCode).toBe(403)
    expect(err.code).toBe('FORBIDDEN')
  })

  it('.notFound()', () => {
    const err = AppError.notFound('Voucher')
    expect(err.statusCode).toBe(404)
    expect(err.code).toBe('RESOURCE_NOT_FOUND')
    expect(err.message).toBe('Voucher not found')
  })

  it('.notFound() with default', () => {
    const err = AppError.notFound()
    expect(err.message).toBe('Resource not found')
  })

  it('.conflict()', () => {
    const err = AppError.conflict('exists')
    expect(err.statusCode).toBe(409)
    expect(err.code).toBe('CONFLICT')
  })

  it('.duplicate()', () => {
    const err = AppError.duplicate('dup', { fields: ['email'] })
    expect(err.statusCode).toBe(409)
    expect(err.code).toBe('DUPLICATE_ENTRY')
    expect(err.details).toEqual({ fields: ['email'] })
  })

  it('.internal()', () => {
    const err = AppError.internal()
    expect(err.statusCode).toBe(500)
    expect(err.code).toBe('INTERNAL_ERROR')
  })
})
