/**
 * Shared TanStack Query client for the app.
 *
 * Centralised here (rather than inline in `main.tsx`) so any module that needs
 * to interact with the cache — and tests that render React Query consumers —
 * can import the same configured instance. Defaults favour a snappy catalogue
 * browsing experience: a short stale time and no refetch-on-focus churn.
 */
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
})

export default queryClient
