import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock dotenv so it doesn't load the real .env file during tests
vi.mock('dotenv', () => ({
  default: { config: vi.fn() },
  config: vi.fn()
}))

describe('env config validation', () => {
  const VALID_ENV = {
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/testdb',
    JWT_SECRET: 'test-secret-for-dev',
    JWT_REFRESH_SECRET: 'test-refresh-secret-for-dev',
    PORT: '4000',
    NODE_ENV: 'test'
  }

  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    originalEnv = { ...process.env }
    vi.resetModules()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('parses valid env successfully', async () => {
    process.env = { ...VALID_ENV }
    const { env } = await import('~/configs/env')

    expect(env.PORT).toBe(4000)
    expect(env.NODE_ENV).toBe('test')
    expect(env.DATABASE_URL).toBe(VALID_ENV.DATABASE_URL)
    expect(env.JWT_SECRET).toBe(VALID_ENV.JWT_SECRET)
    expect(env.JWT_EXPIRES_IN).toBe('7d') // default
    expect(env.CORS_ORIGIN).toBe('http://localhost:5173') // default
  })

  it('applies defaults for optional fields', async () => {
    // Only required fields — defaults should fill in the rest
    process.env = {
      DATABASE_URL: VALID_ENV.DATABASE_URL,
      JWT_SECRET: VALID_ENV.JWT_SECRET,
      JWT_REFRESH_SECRET: VALID_ENV.JWT_REFRESH_SECRET
    }

    const { env } = await import('~/configs/env')

    expect(env.PORT).toBe(4000)
    expect(env.NODE_ENV).toBe('development')
    expect(env.JWT_EXPIRES_IN).toBe('7d')
    expect(env.JWT_REFRESH_EXPIRES_IN).toBe('30d')
    expect(env.CORS_ORIGIN).toBe('http://localhost:5173')
  })

  it('coerces PORT string to number', async () => {
    process.env = { ...VALID_ENV, PORT: '3000' }
    const { env } = await import('~/configs/env')

    expect(env.PORT).toBe(3000)
    expect(typeof env.PORT).toBe('number')
  })

  it('exits on missing DATABASE_URL', async () => {
    const mockExit = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called')
    }) as never)
    const mockError = vi.spyOn(console, 'error').mockImplementation(() => {})

    // Set env WITHOUT DATABASE_URL
    process.env = {
      JWT_SECRET: VALID_ENV.JWT_SECRET,
      JWT_REFRESH_SECRET: VALID_ENV.JWT_REFRESH_SECRET
    }

    await expect(import('~/configs/env')).rejects.toThrow('process.exit called')

    expect(mockExit).toHaveBeenCalledWith(1)
    expect(mockError).toHaveBeenCalledWith('Invalid environment variables:')

    mockExit.mockRestore()
    mockError.mockRestore()
  })

  it('exits on missing JWT_SECRET', async () => {
    const mockExit = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called')
    }) as never)
    const mockError = vi.spyOn(console, 'error').mockImplementation(() => {})

    process.env = {
      DATABASE_URL: VALID_ENV.DATABASE_URL,
      JWT_REFRESH_SECRET: VALID_ENV.JWT_REFRESH_SECRET
    }

    await expect(import('~/configs/env')).rejects.toThrow('process.exit called')

    expect(mockExit).toHaveBeenCalledWith(1)

    mockExit.mockRestore()
    mockError.mockRestore()
  })

  it('rejects invalid NODE_ENV', async () => {
    const mockExit = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called')
    }) as never)
    const mockError = vi.spyOn(console, 'error').mockImplementation(() => {})

    process.env = { ...VALID_ENV, NODE_ENV: 'staging' }

    await expect(import('~/configs/env')).rejects.toThrow('process.exit called')

    mockExit.mockRestore()
    mockError.mockRestore()
  })

  it('env object is frozen', async () => {
    process.env = { ...VALID_ENV }
    const { env } = await import('~/configs/env')

    expect(Object.isFrozen(env)).toBe(true)
  })
})
