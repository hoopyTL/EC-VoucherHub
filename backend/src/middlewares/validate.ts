import type { Request, Response, NextFunction } from 'express'
import type { ZodSchema } from 'zod'

interface ValidationSchema {
  body?: ZodSchema
  params?: ZodSchema
  query?: ZodSchema
}

export const validate = (schema: ValidationSchema) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.validated = {
      body: schema.body ? schema.body.parse(req.body) : req.body,
      query: schema.query ? schema.query.parse(req.query) : req.query,
      params: schema.params ? schema.params.parse(req.params) : req.params
    }
    next()
  }
}
