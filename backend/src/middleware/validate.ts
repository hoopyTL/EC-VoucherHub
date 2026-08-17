import { Request, Response, NextFunction } from 'express'
import { ZodSchema, ZodError } from 'zod'
import { BadRequestError } from './error-handler'

/**
 * Middleware factory: validate req.body bằng Zod schema.
 * Nếu lỗi → trả 400 + details theo field.
 * Nếu hợp lệ → ghi đè req.body bằng dữ liệu đã parse (stripped extra fields).
 */
export const validate = (schema: ZodSchema) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body)
      next()
    } catch (err) {
      if (err instanceof ZodError) {
        const details = err.issues.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }))

        next(new BadRequestError('validation failed', details))
        return
      }

      next(err)
    }
  }
}
