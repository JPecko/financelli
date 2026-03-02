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

export function useMonthSummary(year: number, month: number) {
  const txs = useTransactionsByMonth(year, month)
  const income   = txs.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0)
  const expenses = txs.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0)
  return { income, expenses, balance: income + expenses }
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
