import { useState, useEffect } from 'react'
import { useRefresh, emitRefresh } from '@/shared/hooks/useRefresh'
import { accountsRepo } from '@/data/repositories/accountsRepo'
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
