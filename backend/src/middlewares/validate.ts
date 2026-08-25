import type { Request, Response, NextFunction } from 'express'
import type { ZodSchema } from 'zod'

interface ValidationSchema {
  body?: ZodSchema
  params?: ZodSchema
  query?: ZodSchema
}

function isDirectBodySchema(schema: ValidationSchema | ZodSchema): schema is ZodSchema {
  return typeof (schema as ZodSchema).parse === 'function'
}

/**
 * Validate body/params/query for current routes while remaining compatible
 * with older cart/order routes that pass a body schema directly.
 */
export const validate = (schema: ValidationSchema | ZodSchema) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (isDirectBodySchema(schema)) {
      const body = schema.parse(req.body)
      req.body = body
      req.validated = { body, query: req.query, params: req.params }
      next()
      return
    }

    req.validated = {
      body: schema.body ? schema.body.parse(req.body) : req.body,
      query: schema.query ? schema.query.parse(req.query) : req.query,
      params: schema.params ? schema.params.parse(req.params) : req.params
    }
    next()
  }
}
