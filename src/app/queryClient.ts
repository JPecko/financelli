import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,      // data is fresh for 30s — no refetch within this window
      gcTime:    5 * 60_000,  // keep unused data in cache for 5 min (survives navigation)
      retry:     1,
    },
  },
})
