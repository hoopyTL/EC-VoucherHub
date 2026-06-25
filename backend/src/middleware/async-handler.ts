import { Request, Response, NextFunction, RequestHandler } from 'express'

/**
 * Bọc async route handler, tự động forward lỗi qua next(err).
 * Không cần try/catch rải rác trong controller.
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}
