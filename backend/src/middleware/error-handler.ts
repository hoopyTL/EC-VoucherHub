import { Request, Response, NextFunction } from 'express'

// ─── Typed Error Classes ────────────────────────────────────────────

export class AppError extends Error {
  public readonly statusCode: number
  public readonly details?: Array<{ field: string; message: string }>

  constructor(
    message: string,
    statusCode: number,
    details?: Array<{ field: string; message: string }>,
  ) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.details = details
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'không tìm thấy') {
    super(message, 404)
    this.name = 'NotFoundError'
  }
}

export class ValidationError extends AppError {
  constructor(
    message = 'validation failed',
    details?: Array<{ field: string; message: string }>,
  ) {
    super(message, 422, details)
    this.name = 'ValidationError'
  }
}

export class BadRequestError extends AppError {
  constructor(
    message = 'yêu cầu không hợp lệ',
    details?: Array<{ field: string; message: string }>,
  ) {
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

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  // Typed AppError → map sang status + wrapper
  if (err instanceof AppError) {
    const body: Record<string, unknown> = {
      success: false,
      error: err.message,
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
    error: 'lỗi hệ thống',
  })
}
