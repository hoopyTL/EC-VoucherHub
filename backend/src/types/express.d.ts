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
