import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import dotenv from 'dotenv'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

dotenv.config({ path: path.join(rootDir, 'backend/.env.test'), override: false, quiet: true })

function assertE2eDatabase(): void {
  const value = process.env.DATABASE_URL
  if (!value) throw new Error('DATABASE_URL is required for E2E')
  const url = new URL(value)
  const databaseName = decodeURIComponent(url.pathname.replace(/^\//, ''))
  const allowedHosts = new Set(['localhost', '127.0.0.1', 'db'])
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !allowedHosts.has(url.hostname)) {
    throw new Error('E2E requires a local PostgreSQL database')
  }
  if (databaseName !== 'voucherhub_test') {
    throw new Error('E2E requires the exact voucherhub_test database')
  }
}

function run(command: string, args: string[]): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: rootDir, env: process.env, stdio: 'inherit' })
    child.on('error', reject)
    child.on('exit', (code) => resolve(code ?? 1))
  })
}

async function main(): Promise<void> {
  assertE2eDatabase()

  const migrateCode = await run('npm', ['run', 'db:deploy', '--workspace=backend'])
  if (migrateCode !== 0) process.exit(migrateCode)

  const database = await import('./setup-task004-db')
  try {
    await database.setupTask004Database()
  } finally {
    await database.disconnectTask004Database()
  }

  const playwrightArgs = [
    'exec',
    'playwright',
    'test',
    '--',
    '--config=e2e/playwright.config.ts',
    ...process.argv.slice(2)
  ]
  process.exitCode = await run('npm', playwrightArgs)
}

void main().catch(async (error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
