import type { NextFunction, Request, Response } from 'express'
import { AppError } from '~/utils/app-error'

interface RateLimitOptions {
  windowMs: number
  maxRequests: number
  keyGenerator?: (req: Request) => string
}

interface RateLimitEntry {
  count: number
  resetAt: number
}

const MAX_TRACKED_KEYS = 10000

export function rateLimit({ windowMs, maxRequests, keyGenerator }: RateLimitOptions) {
  const requests = new Map<string, RateLimitEntry>()
  let nextCleanupAt = Date.now() + windowMs

  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now()
    if (now >= nextCleanupAt) {
      for (const [key, value] of requests) {
        if (value.resetAt <= now) requests.delete(key)
      }
      nextCleanupAt = now + windowMs
    }

    const key = keyGenerator?.(req) ?? req.ip ?? req.socket.remoteAddress ?? 'unknown'
    const current = requests.get(key)
    const entry = !current || current.resetAt <= now ? { count: 0, resetAt: now + windowMs } : current

    if (!current && requests.size >= MAX_TRACKED_KEYS) {
      const oldestKey = requests.keys().next().value
      if (oldestKey) requests.delete(oldestKey)
    }

    entry.count += 1
    requests.set(key, entry)
    res.setHeader('X-RateLimit-Limit', maxRequests)
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - entry.count))
    res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetAt / 1000))

    if (entry.count > maxRequests) {
      res.setHeader('Retry-After', Math.ceil((entry.resetAt - now) / 1000))
      next(AppError.rateLimit('Quá nhiều yêu cầu, vui lòng thử lại sau'))
      return
    }

    next()
  }
}
