import type { NextFunction, Request, RequestHandler, Response } from 'express'

/** Forward rejected async route handlers to the central Express error handler. */
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next)
  }
}
