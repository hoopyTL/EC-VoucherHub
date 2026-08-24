import type { RequestHandler } from 'express'
import morgan from 'morgan'

import { env } from '~/configs/env'

// create request logger middleware
function createRequestLogger(): RequestHandler {
  if (env.NODE_ENV === 'test') {
    return (_req, _res, next) => next()
  }

  return morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev')
}

export const requestLogger = createRequestLogger()
