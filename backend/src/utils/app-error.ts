import { ErrorCode, ErrorHttpStatus } from './error-codes'
import type { ErrorCodeValue } from './error-codes'

export class AppError extends Error {
  readonly statusCode: number
  readonly code: ErrorCodeValue
  readonly details?: unknown

  constructor(message: string, statusCode: number, code: ErrorCodeValue, details?: unknown) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.details = details
    Object.setPrototypeOf(this, AppError.prototype)
  }

  // Factory methods

  static badRequest(message = 'Bad request', details?: unknown): AppError {
    return new AppError(message, ErrorHttpStatus[ErrorCode.BAD_REQUEST], ErrorCode.BAD_REQUEST, details)
  }

  static validation(message = 'Validation failed', details?: unknown): AppError {
    return new AppError(message, ErrorHttpStatus[ErrorCode.VALIDATION_ERROR], ErrorCode.VALIDATION_ERROR, details)
  }

  static unauthorized(message = 'Authentication required'): AppError {
    return new AppError(message, ErrorHttpStatus[ErrorCode.UNAUTHORIZED], ErrorCode.UNAUTHORIZED)
  }

  static forbidden(message = 'Access denied'): AppError {
    return new AppError(message, ErrorHttpStatus[ErrorCode.FORBIDDEN], ErrorCode.FORBIDDEN)
  }

  static notFound(resource = 'Resource'): AppError {
    return new AppError(
      `${resource} not found`,
      ErrorHttpStatus[ErrorCode.RESOURCE_NOT_FOUND],
      ErrorCode.RESOURCE_NOT_FOUND
    )
  }

  static conflict(message = 'Resource already exists', details?: unknown): AppError {
    return new AppError(message, ErrorHttpStatus[ErrorCode.CONFLICT], ErrorCode.CONFLICT, details)
  }

  static duplicate(message = 'Duplicate entry', details?: unknown): AppError {
    return new AppError(message, ErrorHttpStatus[ErrorCode.DUPLICATE_ENTRY], ErrorCode.DUPLICATE_ENTRY, details)
  }

  static internal(message = 'Internal server error'): AppError {
    return new AppError(message, ErrorHttpStatus[ErrorCode.INTERNAL_ERROR], ErrorCode.INTERNAL_ERROR)
  }
}
