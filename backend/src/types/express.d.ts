import type { JwtPayload } from '~/utils/jwt'

declare global {
  namespace Express {
    interface Request {
      validated?: {
        body: unknown
        params: unknown
        query: unknown
      }
      user?: JwtPayload
    }
  }
}

export {}
