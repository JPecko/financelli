import { useState, useEffect } from 'react'
import { useRefresh, emitRefresh } from '@/shared/hooks/useRefresh'
import { transactionsRepo } from '@/data/repositories/transactionsRepo'
import type { Transaction } from '@/domain/types'

export function useTransactions(): Transaction[] {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const key = useRefresh()
  useEffect(() => { transactionsRepo.getAll().then(setTransactions) }, [key])
  return transactions
}

export function useTransactionsByMonth(year: number, month: number): Transaction[] {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const key = useRefresh()
  useEffect(() => {
    transactionsRepo.getByMonth(year, month).then(setTransactions)
  }, [year, month, key])
  return transactions
}

/** Returns true for transactions that represent real cash flow (not internal moves or capital) */
export function isCashFlow(t: Transaction): boolean {
  if (t.type === 'revaluation') return false
  if (t.type === 'transfer' && t.toAccountId != null) return false
  if (t.type === 'transfer' && t.category === 'capital') return false
  return true
}

export function useMonthSummary(year: number, month: number) {
  const txs = useTransactionsByMonth(year, month)
  const real       = txs.filter(isCashFlow)
  const income     = real.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0)
  const expenses   = real.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0)
  const marketGain = txs
    .filter(t => t.type === 'revaluation')
    .reduce((s, t) => s + t.amount, 0)
  return { income, expenses, balance: income + expenses, marketGain }
}

export async function addTransaction(data: Omit<Transaction, 'id' | 'createdAt'>) {
  await transactionsRepo.add(data)
  emitRefresh()
}

export async function updateTransaction(id: number, data: Partial<Transaction>) {
  await transactionsRepo.update(id, data)
  emitRefresh()
}

export async function removeTransaction(id: number) {
  await transactionsRepo.remove(id)
  emitRefresh()
}
