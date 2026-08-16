const allowedTestHosts = new Set(['localhost', '127.0.0.1', 'db'])

export function assertTestDatabaseUrl(value: string | undefined): void {
  if (!value) throw new Error('DATABASE_URL is required for tests')

  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL URL')
  }

  const databaseName = decodeURIComponent(url.pathname.replace(/^\//, ''))
  const isPostgres = url.protocol === 'postgresql:' || url.protocol === 'postgres:'

  if (!isPostgres || !allowedTestHosts.has(url.hostname) || databaseName !== 'voucherhub_test') {
    throw new Error('Tests require the exact local voucherhub_test database')
  }
}
