import type { Response } from 'express'

interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export class ApiResponse {
  static success<T>(res: Response, data: T, statusCode = 200, meta?: PaginationMeta): void {
    const body: { success: true; data: T; meta?: PaginationMeta } = { success: true, data }
    if (meta) body.meta = meta
    res.status(statusCode).json(body)
  }

  static created<T>(res: Response, data: T): void {
    ApiResponse.success(res, data, 201)
  }

  static noContent(res: Response): void {
    res.status(204).end()
  }
}
