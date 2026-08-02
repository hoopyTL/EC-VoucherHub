// Extend Express Request with validated data from Zod middleware.

declare namespace Express {
  interface Request {
    validated?: {
      body: unknown
      params: unknown
      query: unknown
    }
  }
}

declare global {
  namespace Express {
    interface Request {
      validated?: unknown
      user?: {
        id: string
        role: string
      }
    }
  }
}

export {}
