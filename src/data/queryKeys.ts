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
  sharedExpenses: {
    all:     ()                            => ['sharedExpenses']                         as const,
    byMonth: (year: number, month: number) => ['sharedExpenses', 'byMonth', year, month] as const,
    open:    ()                            => ['sharedExpenses', 'open']                 as const,
  },
  groups: {
    all:     ()             => ['groups']                      as const,
    detail:  (id: number)   => ['groups', 'detail', id]        as const,
    members: (id: number)   => ['groups', 'members', id]       as const,
    entries: (id: number)   => ['groups', 'entries', id]       as const,
    splits:  (entryId: number) => ['groups', 'splits', entryId] as const,
  },
  holdings: {
    all:       ()                => ['holdings']                    as const,
    byAccount: (accountId: number) => ['holdings', 'byAccount', accountId] as const,
  },
} as const
