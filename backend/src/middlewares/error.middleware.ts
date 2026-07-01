import { NextFunction, Request, Response } from 'express'
import { HttpError } from '../errors/http-error'

export function asyncHandler(handler: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, next).catch(next)
  }
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.path} not found`
  })
}

export function errorHandler(error: Error, _req: Request, res: Response, _next: NextFunction) {
  void _next

  if (error instanceof HttpError) {
    res.status(error.statusCode).json({
      success: false,
      error: error.message,
      ...(error.details ? { details: error.details } : {})
    })
    return
  }

  const message = error.message || ''
  const isPrismaDatabaseError =
    error.name.includes('Prisma') ||
    message.includes("Can't reach database server") ||
    message.includes('Timed out fetching a new connection')

  if (isPrismaDatabaseError) {
    console.error(error)
    res.status(503).json({
      success: false,
      error: 'Database is unavailable. Check DATABASE_URL and make sure PostgreSQL is running.'
    })
    return
  }

  console.error(error)
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  })
}
