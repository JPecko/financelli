import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/data/db'
import { accountsRepo } from '@/data/repositories/accountsRepo'
import type { Account } from '@/domain/types'

export function useAccounts() {
  return useLiveQuery(() => db.accounts.orderBy('createdAt').toArray(), []) ?? []
}

export function useAccount(id: number | undefined) {
  return useLiveQuery(
    () => (id != null ? db.accounts.get(id) : undefined),
    [id],
  )
}

export function useNetWorth() {
  const accounts = useAccounts()
  return accounts.reduce((sum, a) => sum + a.balance, 0)
}

export async function addAccount(data: Omit<Account, 'id' | 'createdAt'>) {
  return accountsRepo.add({ ...data, createdAt: new Date().toISOString() })
}

export async function updateAccount(id: number, data: Partial<Account>) {
  return accountsRepo.update(id, data)
}

export async function removeAccount(id: number) {
  return accountsRepo.remove(id)
}
