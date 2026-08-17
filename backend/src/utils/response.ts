import { Response } from 'express'

/**
 * Response wrapper nhất quán theo API contract:
 * { success: true, data: <T> }
 */
export const successResponse = <T>(
  res: Response,
  data: T,
  statusCode = 200,
): void => {
  res.status(statusCode).json({ success: true, data })
}

/**
 * Shorthand cho 201 Created.
 */
export const createdResponse = <T>(res: Response, data: T): void => {
  successResponse(res, data, 201)
}

/**
 * Shorthand cho 204 No Content (không body).
 */
export const noContentResponse = (res: Response): void => {
  res.status(204).send()
}
