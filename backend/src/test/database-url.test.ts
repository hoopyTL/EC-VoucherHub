import { describe, expect, it } from 'vitest'
import { assertTestDatabaseUrl } from './database-url'

describe('test database URL guard', () => {
  it.each([
    'postgresql://postgres:postgres@localhost:5432/voucherhub_test',
    'postgres://postgres:postgres@127.0.0.1:5432/voucherhub_test',
    'postgresql://postgres:postgres@db:5432/voucherhub_test'
  ])('accepts the isolated local test database', (url) => {
    expect(() => assertTestDatabaseUrl(url)).not.toThrow()
  })

  it.each([
    undefined,
    'not-a-url',
    'postgresql://postgres:postgres@localhost:5432/voucherhub',
    'postgresql://postgres:postgres@localhost:5432/voucherhub?application_name=voucherhub_test',
    'postgresql://postgres:postgres@production.example.com:5432/voucherhub_test',
    'mysql://root:root@localhost:3306/voucherhub_test'
  ])('rejects every unsafe or deceptive URL', (url) => {
    expect(() => assertTestDatabaseUrl(url)).toThrow()
  })
})
