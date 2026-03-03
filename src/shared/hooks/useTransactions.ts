import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/data/db'
import { transactionsRepo } from '@/data/repositories/transactionsRepo'
import type { Transaction } from '@/domain/types'

export function useTransactions() {
  return useLiveQuery(() => db.transactions.orderBy('date').reverse().toArray(), []) ?? []
}

export function useTransactionsByMonth(year: number, month: number) {
  return useLiveQuery(
    () => transactionsRepo.getByMonth(year, month),
    [year, month],
  ) ?? []
}

/** Returns true for transactions that represent real cash flow (not internal moves or capital) */
export function isCashFlow(t: Transaction): boolean {
  if (t.type === 'revaluation') return false                        // market fluctuation
  if (t.type === 'transfer' && t.toAccountId != null) return false  // internal transfer
  if (t.type === 'transfer' && t.category === 'capital') return false // capital movement
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
  return transactionsRepo.add({ ...data, createdAt: new Date().toISOString() })
}

export async function updateTransaction(id: number, data: Partial<Transaction>) {
  return transactionsRepo.update(id, data)
}

export async function removeTransaction(id: number) {
  return transactionsRepo.remove(id)
}
