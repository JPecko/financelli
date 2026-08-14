import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { accountsRepo } from '@/data/repositories/accountsRepo'
import { queryClient } from '@/app/queryClient'
import { queryKeys } from '@/data/queryKeys'
import { useAccountPrefsStore, type SortKey } from '@/shared/store/accountPrefsStore'
import { groupAccounts } from '@/domain/accountGrouping'
import type { Account } from '@/domain/types'

// ─── Queries ────────────────────────────────────────────────────────────────

export function useAccounts() {
  return useQuery({
    queryKey: queryKeys.accounts.all(),
    queryFn:  accountsRepo.getAll,
  })
}

export function useAccount(id: number | undefined) {
  return useQuery({
    queryKey: ['accounts', id],
    queryFn:  () => accountsRepo.getById(id!),
    enabled:  id != null,
  })
}

export function useNetWorth() {
  const { data: accounts = [] } = useAccounts()
  return accounts.reduce((sum, a) => sum + a.balance, 0)
}

// ─── Sorting ─────────────────────────────────────────────────────────────────

/** Applies the user's chosen sort, then groups current/savings/investment accounts together
 *  (stable — preserves the sort order within each group). This is the canonical order used
 *  everywhere accounts are listed, so the Accounts page and every account dropdown/select match. */
export function sortAccounts(
  accounts: Account[],
  sort: SortKey,
  manualOrder: number[],
  colorOrder: string[],
  balanceOf: (account: Account) => number = a => a.balance,
): Account[] {
  let sorted = accounts
  if (sort === 'manual' && manualOrder.length > 0) {
    const idx = Object.fromEntries(manualOrder.map((id, i) => [id, i]))
    sorted = [...accounts].sort((a, b) => (idx[a.id!] ?? 999) - (idx[b.id!] ?? 999))
  } else if (sort === 'name') {
    sorted = [...accounts].sort((a, b) => a.name.localeCompare(b.name))
  } else if (sort === 'type') {
    sorted = [...accounts].sort((a, b) => a.type.localeCompare(b.type))
  } else if (sort === 'color') {
    sorted = [...accounts].sort((a, b) => {
      const ai = colorOrder.indexOf(a.color)
      const bi = colorOrder.indexOf(b.color)
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
    })
  } else if (sort === 'balance') {
    sorted = [...accounts].sort((a, b) => balanceOf(b) - balanceOf(a))
  }
  return groupAccounts(sorted)
}

/** Returns the accounts list already sorted per user preferences. */
export function useSortedAccounts() {
  const query = useAccounts()
  const { sort, manualOrder, colorOrder } = useAccountPrefsStore()
  const data = useMemo(
    () => sortAccounts(query.data ?? [], sort, manualOrder, colorOrder),
    [query.data, sort, manualOrder, colorOrder],
  )
  return { ...query, data }
}

// ─── Mutations ───────────────────────────────────────────────────────────────
// Standalone async functions — call queryClient.invalidateQueries so all
// subscribers receive fresh data automatically.

export async function addAccount(data: Omit<Account, 'id' | 'createdAt'>) {
  const created = await accountsRepo.add(data)
  queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all() })
  return created
}

export async function updateAccount(id: number, data: Partial<Account>) {
  await accountsRepo.update(id, data)
  queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all() })
}

export async function removeAccount(id: number) {
  await accountsRepo.remove(id)
  queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all() })
}
