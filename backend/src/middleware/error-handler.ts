import { Request, Response, NextFunction } from 'express'
import { AppError as CoreAppError } from '~/utils/app-error'
import { ErrorCode } from '~/utils/error-codes'
import type { ErrorCodeValue } from '~/utils/error-codes'

function codeForStatus(statusCode: number): ErrorCodeValue {
  switch (statusCode) {
    case 400:
      return ErrorCode.BAD_REQUEST
    case 401:
      return ErrorCode.UNAUTHORIZED
    case 403:
      return ErrorCode.FORBIDDEN
    case 404:
      return ErrorCode.RESOURCE_NOT_FOUND
    case 409:
      return ErrorCode.CONFLICT
    case 422:
      return ErrorCode.UNPROCESSABLE_ENTITY
    default:
      return ErrorCode.INTERNAL_ERROR
  }
}

// ─── Typed Error Classes ────────────────────────────────────────────

export class AppError extends CoreAppError {
  declare readonly details?: Array<{ field: string; message: string }>

  constructor(message: string, statusCode: number, details?: Array<{ field: string; message: string }>) {
    super(message, statusCode, codeForStatus(statusCode), details)
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'không tìm thấy') {
    super(message, 404)
    this.name = 'NotFoundError'
  }
}

export class ValidationError extends AppError {
  constructor(message = 'validation failed', details?: Array<{ field: string; message: string }>) {
    super(message, 422, details)
    this.name = 'ValidationError'
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'yêu cầu không hợp lệ', details?: Array<{ field: string; message: string }>) {
    super(message, 400, details)
    this.name = 'BadRequestError'
  }
}

export class ConflictError extends AppError {
  constructor(message = 'xung đột trạng thái') {
    super(message, 409)
    this.name = 'ConflictError'
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'không đủ quyền') {
    super(message, 403)
    this.name = 'ForbiddenError'
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'chưa xác thực') {
    super(message, 401)
    this.name = 'UnauthorizedError'
  }
}

// ─── Error Handler Middleware ───────────────────────────────────────

export const errorHandler = (err: Error, _req: Request, res: Response, _next: NextFunction): void => {
  // Typed AppError → map sang status + wrapper
  if (err instanceof AppError) {
    const body: Record<string, unknown> = {
      success: false,
      error: err.message
    }
    if (err.details && err.details.length > 0) {
      body.details = err.details
    }
    res.status(err.statusCode).json(body)
    return
  }

  // Unexpected error → 500
  console.error('[ERROR]', err)
  res.status(500).json({
    success: false,
    error: 'lỗi hệ thống'
  })
}
