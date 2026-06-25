import type { RequestHandler } from 'express'

import { AppError } from '~/utils/app-error'
import { ErrorCode } from '~/utils/error-codes'

// catch routers not found and call errorHandler
export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new AppError(`Route ${req.method} ${req.originalUrl} not found`, 404, ErrorCode.NOT_FOUND))
}
