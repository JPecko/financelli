import type { Account, AccountType } from './types'

// Canonical account grouping used across the app: current-like types, then savings, then investment.
// This is the single source of truth for ordering — the Accounts page sections, every account
// dropdown/select, and any other listing should all derive from this.
export type AccountGroup = 'current' | 'savings' | 'investment'

const GROUP_ORDER: Record<AccountGroup, number> = { current: 0, savings: 1, investment: 2 }

export function accountGroup(type: AccountType): AccountGroup {
  if (type === 'investment') return 'investment'
  if (type === 'savings') return 'savings'
  return 'current'
}

/** Stable partition by group, preserving whatever relative order the input already has within each group. */
export function groupAccounts(accounts: Account[]): Account[] {
  return [...accounts].sort((a, b) => GROUP_ORDER[accountGroup(a.type)] - GROUP_ORDER[accountGroup(b.type)])
}

/** IDs of the first account in each group present in the list — used to render section dividers. */
export function firstOfGroupIds(accounts: Account[]): Set<number> {
  const ids = new Set<number>()
  for (const group of Object.keys(GROUP_ORDER) as AccountGroup[]) {
    const first = accounts.find(a => accountGroup(a.type) === group)
    if (first?.id != null) ids.add(first.id)
  }
  return ids
}
