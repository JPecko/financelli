import { useState, useEffect } from 'react'
import { useRefresh, emitRefresh } from '@/shared/hooks/useRefresh'
import { accountsRepo } from '@/data/repositories/accountsRepo'
import { useAccountPrefsStore, type SortKey } from '@/shared/store/accountPrefsStore'
import type { Account } from '@/domain/types'

export function useAccounts(): Account[] {
  const [accounts, setAccounts] = useState<Account[]>([])
  const key = useRefresh()
  useEffect(() => { accountsRepo.getAll().then(setAccounts) }, [key])
  return accounts
}

export function useAccount(id: number | undefined): Account | undefined {
  const [account, setAccount] = useState<Account | undefined>()
  const key = useRefresh()
  useEffect(() => {
    if (id == null) { setAccount(undefined); return }
    accountsRepo.getById(id).then(setAccount)
  }, [id, key])
  return account
}

export function useNetWorth(): number {
  const accounts = useAccounts()
  return accounts.reduce((sum, a) => sum + a.balance, 0)
}

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

export function useSortedAccounts(): Account[] {
  const accounts = useAccounts()
  const { sort, manualOrder, colorOrder } = useAccountPrefsStore()
  return sortAccounts(accounts, sort, manualOrder, colorOrder)
}

export async function addAccount(data: Omit<Account, 'id' | 'createdAt'>) {
  await accountsRepo.add(data)
  emitRefresh()
}

export async function updateAccount(id: number, data: Partial<Account>) {
  await accountsRepo.update(id, data)
  emitRefresh()
}

export async function removeAccount(id: number) {
  await accountsRepo.remove(id)
  emitRefresh()
}
