/**
 * Centralised query key factory.
 *
 * Key hierarchy enables prefix-based invalidation:
 *   invalidateQueries({ queryKey: queryKeys.transactions.all() })
 *   → invalidates byMonth + netFlow queries automatically
 */
export const queryKeys = {
  accounts: {
    all: () => ['accounts'] as const,
  },
  transactions: {
    all:     ()                              => ['transactions']                        as const,
    byMonth: (year: number, month: number)  => ['transactions', 'byMonth', year, month] as const,
    netFlow: (year: number, month: number)  => ['transactions', 'netFlow', year, month] as const,
  },
  rules: {
    all: () => ['rules'] as const,
  },
} as const
