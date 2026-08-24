// Vitest global test setup for the client package.
// Cleans up the rendered DOM between tests to avoid cross-test leakage.
import { afterEach, beforeAll, beforeEach } from 'vitest'
import { cleanup } from '@testing-library/react'
// Initialise i18n so components using useTranslation() render in tests
// (English bundle / fallback). Importing for the side effect is enough.
import i18n from './i18n'

const originalWarn = console.warn.bind(console)
beforeEach(() => {
  console.warn = (...args: unknown[]) => {
    const message = String(args[0] ?? '')
    if (message.includes('React Router Future Flag Warning')) return
    originalWarn(...args)
  }
})

beforeAll(async () => {
  await i18n.changeLanguage('en')
})

afterEach(() => {
  cleanup()
})
