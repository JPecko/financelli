import { useQuery } from '@tanstack/react-query'
import { accountsRepo } from '@/data/repositories/accountsRepo'
import { queryClient } from '@/app/queryClient'
import { queryKeys } from '@/data/queryKeys'
import { useAccountPrefsStore, type SortKey } from '@/shared/store/accountPrefsStore'
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

export function sortAccounts(
  accounts: Account[],
  sort: SortKey,
  manualOrder: number[],
  colorOrder: string[],
): Account[] {
  if (sort === 'manual' && manualOrder.length > 0) {
    const idx = Object.fromEntries(manualOrder.map((id, i) => [id, i]))
    return [...accounts].sort((a, b) => (idx[a.id!] ?? 999) - (idx[b.id!] ?? 999))
  }
  if (sort === 'name')    return [...accounts].sort((a, b) => a.name.localeCompare(b.name))
  if (sort === 'type')    return [...accounts].sort((a, b) => a.type.localeCompare(b.type))
  if (sort === 'color') {
    return [...accounts].sort((a, b) => {
      const ai = colorOrder.indexOf(a.color)
      const bi = colorOrder.indexOf(b.color)
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
    })
  }
  if (sort === 'balance') return [...accounts].sort((a, b) => b.balance - a.balance)
  return accounts
}

/** Returns the accounts list already sorted per user preferences. */
export function useSortedAccounts() {
  const query = useAccounts()
  const { sort, manualOrder, colorOrder } = useAccountPrefsStore()
  return {
    ...query,
    data: sortAccounts(query.data ?? [], sort, manualOrder, colorOrder),
  }
}

// ─── Mutations ───────────────────────────────────────────────────────────────
// Standalone async functions — call queryClient.invalidateQueries so all
// subscribers receive fresh data automatically.

export async function addAccount(data: Omit<Account, 'id' | 'createdAt'>) {
  await accountsRepo.add(data)
  queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all() })
}

export async function updateAccount(id: number, data: Partial<Account>) {
  await accountsRepo.update(id, data)
  queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all() })
}

export async function removeAccount(id: number) {
  await accountsRepo.remove(id)
  queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all() })
}
