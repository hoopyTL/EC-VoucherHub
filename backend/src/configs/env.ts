import dotenv from 'dotenv'
import { z } from 'zod'
import path from 'node:path'

dotenv.config({ path: path.resolve(process.cwd(), '.env'), quiet: true })
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env'), quiet: true })

const forbiddenProductionSecrets = ['dev-only-secret-change-me', 'dev-only-refresh-secret-change-me']

const envSchema = z
  .object({
    // Server
    PORT: z.coerce.number().int().positive().default(4000),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

    // Database
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

    // JWT
    JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
    JWT_EXPIRES_IN: z.string().default('7d'),
    JWT_REFRESH_SECRET: z.string().min(1, 'JWT_REFRESH_SECRET is required'),
    JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

    // CORS
    CORS_ORIGIN: z.string().default('http://localhost:5173')
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV !== 'production') return

    for (const field of ['JWT_SECRET', 'JWT_REFRESH_SECRET'] as const) {
      if (data[field].length < 32 || forbiddenProductionSecrets.includes(data[field])) {
        ctx.addIssue({
          code: 'custom',
          path: [field],
          message: `${field} must be at least 32 characters and non-placeholder in production`
        })
      }
    }
  })

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('Invalid environment variables:')
  for (const issue of parsed.error.issues) {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`)
  }
  process.exit(1)
}

export const env = Object.freeze(parsed.data)
export type Env = z.infer<typeof envSchema>
