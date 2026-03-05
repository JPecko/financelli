import { useQuery } from '@tanstack/react-query'
import { getYear, getMonth, format } from 'date-fns'
import { transactionsRepo } from '@/data/repositories/transactionsRepo'
import { queryClient } from '@/app/queryClient'
import { queryKeys } from '@/data/queryKeys'
import { useAccounts } from '@/shared/hooks/useAccounts'
import type { Transaction } from '@/domain/types'

// ─── Queries ────────────────────────────────────────────────────────────────

export function useTransactionsByMonth(year: number, month: number) {
  return useQuery({
    queryKey: queryKeys.transactions.byMonth(year, month),
    queryFn:  () => transactionsRepo.getByMonth(year, month),
  })
}

/** Fetches net cash-flow for the 6 months ending at (year, month). Used for the line chart. */
export function useMonthlyNetFlow(year: number, month: number) {
  return useQuery({
    queryKey: queryKeys.transactions.netFlow(year, month),
    queryFn:  async () => {
      const result: { month: string; net: number }[] = []
      for (let i = 5; i >= 0; i--) {
        const d    = new Date(year, month - 1 - i, 1)
        const txs  = await transactionsRepo.getByMonth(getYear(d), getMonth(d) + 1)
        result.push({ month: format(d, 'MMM yy'), net: txs.filter(isCashFlow).reduce((s, t) => s + t.amount, 0) })
      }
      return result
    },
  })
}

// ─── Derived / computed hooks ────────────────────────────────────────────────

/** Returns true for transactions that represent real cash flow (not internal moves or capital gains). */
export function isCashFlow(t: Transaction): boolean {
  if (t.type === 'revaluation') return false
  if (t.type === 'transfer' && t.toAccountId != null) return false
  if (t.type === 'transfer' && t.category === 'capital') return false
  return true
}

/** Computes monthly income/expense summary, dividing shared-account values by participants. */
export function useMonthSummary(year: number, month: number) {
  const { data: txs      = [] } = useTransactionsByMonth(year, month)
  const { data: accounts = [] } = useAccounts()

  const real     = txs.filter(isCashFlow)
  const income   = real.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0)
  const expenses = real.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0)

  const personalExpenses = real
    .filter(t => t.amount < 0)
    .reduce((s, t) => {
      const participants = accounts.find(a => a.id === t.accountId)?.participants ?? 1
      return s + t.amount / participants
    }, 0)

  const personalIncome = real
    .filter(t => t.amount > 0)
    .reduce((s, t) => {
      const participants = accounts.find(a => a.id === t.accountId)?.participants ?? 1
      return s + t.amount / participants
    }, 0)

  const marketGain = txs
    .filter(t => t.type === 'revaluation')
    .reduce((s, t) => s + t.amount, 0)

  return {
    income, expenses, balance: income + expenses,
    personalIncome, personalExpenses, personalBalance: personalIncome + personalExpenses,
    marketGain,
  }
}

// ─── Mutations ───────────────────────────────────────────────────────────────
// Transactions affect account balances, so both caches are invalidated.
// Prefix-based invalidation on ['transactions'] covers byMonth + netFlow.

export async function addTransaction(data: Omit<Transaction, 'id' | 'createdAt'>) {
  await transactionsRepo.add(data)
  queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all() })
  queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all() })
}

export async function updateTransaction(id: number, data: Partial<Transaction>) {
  await transactionsRepo.update(id, data)
  queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all() })
  queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all() })
}

export async function removeTransaction(id: number) {
  await transactionsRepo.remove(id)
  queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all() })
  queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all() })
}
