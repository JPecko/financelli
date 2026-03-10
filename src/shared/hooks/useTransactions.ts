import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getYear, getMonth, format } from 'date-fns'
import { supabase } from '@/data/supabase'
import { transactionsRepo } from '@/data/repositories/transactionsRepo'
import { queryClient } from '@/app/queryClient'
import { queryKeys } from '@/data/queryKeys'
import { useAccounts } from '@/shared/hooks/useAccounts'
import type { Transaction, Account } from '@/domain/types'

// ─── Queries ────────────────────────────────────────────────────────────────

export function useTransactionsByMonth(year: number, month: number) {
  return useQuery({
    queryKey: queryKeys.transactions.byMonth(year, month),
    queryFn:  () => transactionsRepo.getByMonth(year, month),
  })
}

/** Fetches income, expenses, investing and roundup for the 6 months ending at (year, month). */
export function useMonthlyNetFlow(year: number, month: number) {
  return useQuery({
    queryKey: queryKeys.transactions.netFlow(year, month),
    queryFn:  async () => {
      const result: { month: string; income: number; expenses: number; investing: number; roundup: number; net: number }[] = []
      for (let i = 5; i >= 0; i--) {
        const d    = new Date(year, month - 1 - i, 1)
        const cash = (await transactionsRepo.getByMonth(getYear(d), getMonth(d) + 1)).filter(isCashFlow)
        const income    = cash.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0)
        const investing = cash.filter(t => t.amount < 0 && t.category === 'investing').reduce((s, t) => s + Math.abs(t.amount), 0)
        const roundup   = cash.filter(t => t.amount < 0 && t.category === 'roundup').reduce((s, t) => s + Math.abs(t.amount), 0)
        const expenses  = cash.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0) - investing - roundup
        result.push({ month: format(d, 'MMM yy'), income, expenses, investing, roundup, net: income - expenses - investing - roundup })
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
  if (t.type === 'transfer' && (t.category === 'capital' || t.category === 'invest-move')) return false
  return true
}

/** Computes monthly income/expense summary, dividing shared-account values by participants. */
export function useMonthSummary(year: number, month: number) {
  const { data: txs      = [] } = useTransactionsByMonth(year, month)
  const { data: accounts = [] } = useAccounts()

  const real         = txs.filter(isCashFlow)
  const income       = real.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0)
  const expenses     = real.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0)
  const coreExpenses = real.filter(t => t.amount < 0 && t.category !== 'investing' && t.category !== 'roundup').reduce((s, t) => s + t.amount, 0)

  const divisorFor = (t: Transaction) =>
    t.isPersonal ? 1 : (t.splitN ?? accounts.find(a => a.id === t.accountId)?.participants ?? 1)

  const personalExpenses = real
    .filter(t => t.amount < 0)
    .reduce((s, t) => s + t.amount / divisorFor(t), 0)

  const personalIncome = real
    .filter(t => t.amount > 0)
    .reduce((s, t) => s + t.amount / divisorFor(t), 0)

  const personalInvesting = real
    .filter(t => t.amount < 0 && t.category === 'investing')
    .reduce((s, t) => s + t.amount / divisorFor(t), 0)

  const personalRoundup = real
    .filter(t => t.amount < 0 && t.category === 'roundup')
    .reduce((s, t) => s + t.amount / divisorFor(t), 0)

  const marketGain = txs
    .filter(t => t.type === 'revaluation')
    .reduce((s, t) => s + t.amount, 0)

  return {
    income, expenses, coreExpenses, balance: income + expenses,
    personalIncome, personalExpenses, personalBalance: personalIncome + personalExpenses,
    personalInvesting, personalRoundup,
    marketGain,
  }
}

/**
 * Returns monthly cashback (computed from expense transactions × account cashbackPct)
 * + roundup (from roundup transactions) for the last 6 months ending at (year, month).
 *
 * Cache: invalidated on every transaction mutation via ['benefits'] prefix.
 */
export function useMonthlyBenefits(year: number, month: number) {
  const { data: accounts = [] } = useAccounts()

  // 6-month window bounds
  const startD = new Date(year, month - 6, 1)
  const windowStart = `${getYear(startD)}-${String(getMonth(startD) + 1).padStart(2, '0')}-01`
  const nm = month === 12 ? 1 : month + 1
  const ny = month === 12 ? year + 1 : year
  const windowEnd = `${ny}-${String(nm).padStart(2, '0')}-01`

  // Expense transactions in window — for cashback computation (exclude roundup/cashback categories)
  const { data: expenseRows = [] } = useQuery({
    queryKey: ['benefits', 'expense-raw', year, month],
    queryFn: async () => {
      const { data } = await supabase
        .from('transactions')
        .select('account_id, amount, date')
        .eq('type', 'expense')
        .neq('category', 'roundup')
        .neq('category', 'cashback')
        .lt('amount', 0)
        .gte('date', windowStart)
        .lt('date', windowEnd)
      return (data ?? []) as { account_id: number; amount: number; date: string }[]
    },
  })

  // Roundup transactions in window
  const { data: roundupRows = [] } = useQuery({
    queryKey: ['benefits', 'roundup-raw', year, month],
    queryFn: async () => {
      const { data } = await supabase
        .from('transactions')
        .select('amount, date')
        .eq('category', 'roundup')
        .gte('date', windowStart)
        .lt('date', windowEnd)
      return (data ?? []) as { amount: number; date: string }[]
    },
  })

  const data = useMemo(() => {
    const result: { month: string; cashback: number; roundup: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d    = new Date(year, month - 1 - i, 1)
      const y    = getYear(d)
      const m    = getMonth(d) + 1
      const from = `${y}-${String(m).padStart(2, '0')}-01`
      const enm  = m === 12 ? 1 : m + 1
      const eny  = m === 12 ? y + 1 : y
      const to   = `${eny}-${String(enm).padStart(2, '0')}-01`

      const roundup = roundupRows
        .filter(r => r.date >= from && r.date < to)
        .reduce((s, r) => s + Math.abs(r.amount), 0)

      const cashback = expenseRows
        .filter(e => e.date >= from && e.date < to)
        .reduce((s, e) => {
          const acc = accounts.find(a => a.id === e.account_id)
          if (!acc?.cashbackPct) return s
          return s + Math.floor(Math.abs(e.amount) * acc.cashbackPct / 100)
        }, 0)

      result.push({ month: format(d, 'MMM yy'), cashback, roundup })
    }
    return result
  }, [year, month, expenseRows, roundupRows, accounts])

  return { data }
}

/**
 * Returns YTD cashback (computed) + roundup (from transactions) for the given year.
 * Cache: invalidated on every transaction mutation via ['benefits'] prefix.
 */
export function useYearBenefits(year: number) {
  const { data: accounts = [] } = useAccounts()

  const { data: expenseRows = [] } = useQuery({
    queryKey: ['benefits', 'year-expense', year],
    queryFn: async () => {
      const { data } = await supabase
        .from('transactions')
        .select('account_id, amount')
        .eq('type', 'expense')
        .neq('category', 'roundup')
        .neq('category', 'cashback')
        .lt('amount', 0)
        .gte('date', `${year}-01-01`)
        .lt('date', `${year + 1}-01-01`)
      return (data ?? []) as { account_id: number; amount: number }[]
    },
  })

  const { data: roundupRows = [] } = useQuery({
    queryKey: ['benefits', 'year-roundup', year],
    queryFn: async () => {
      const { data } = await supabase
        .from('transactions')
        .select('amount')
        .eq('category', 'roundup')
        .gte('date', `${year}-01-01`)
        .lt('date', `${year + 1}-01-01`)
      return (data ?? []) as { amount: number }[]
    },
  })

  const data = useMemo(() => ({
    cashback: expenseRows.reduce((s, e) => {
      const acc = accounts.find(a => a.id === e.account_id)
      if (!acc?.cashbackPct) return s
      return s + Math.floor(Math.abs(e.amount) * acc.cashbackPct / 100)
    }, 0),
    roundup: roundupRows.reduce((s, r) => s + Math.abs(r.amount), 0),
  }), [expenseRows, roundupRows, accounts])

  return { data }
}

// ─── Running balance ─────────────────────────────────────────────────────────

/** Fetches the total amount of transactions AFTER the given month for each account. */
function useLaterSums(year: number, month: number) {
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear  = month === 12 ? year + 1 : year
  const afterDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`
  return useQuery({
    queryKey: ['laterSums', year, month],
    queryFn: async () => {
      const { data } = await supabase
        .from('transactions')
        .select('account_id, amount')
        .gte('date', afterDate)
      const map: Record<number, number> = {}
      for (const row of (data ?? []) as { account_id: number; amount: number }[]) {
        map[row.account_id] = (map[row.account_id] ?? 0) + row.amount
      }
      return map
    },
  })
}

/**
 * Computes the account running balance (balance AFTER each transaction) for every
 * transaction in the given month. Returns a map of { [transactionId]: balance }.
 *
 * Algorithm: start from each account's current balance, subtract transactions that
 * happened after this month to get the end-of-month balance, then walk the month's
 * transactions newest-first to derive each transaction's post-balance.
 */
export function useRunningBalances(year: number, month: number): Record<number, number> {
  const { data: accounts = [] } = useAccounts()
  const { data: txs      = [] } = useTransactionsByMonth(year, month)
  const { data: laterSums = {} } = useLaterSums(year, month)

  return useMemo(() => {
    if (txs.length === 0) return {}

    // Balance of each account at the end of the displayed month
    const endBalance: Record<number, number> = {}
    for (const acc of accounts) {
      endBalance[acc.id!] = acc.balance - (laterSums[acc.id!] ?? 0)
    }

    // Walk transactions from newest → oldest (txs are already sorted date+created_at desc)
    const result: Record<number, number> = {}
    const running = { ...endBalance }
    for (const tx of txs) {
      if (tx.id == null) continue
      result[tx.id] = running[tx.accountId] ?? 0      // balance AFTER this tx
      running[tx.accountId] = (running[tx.accountId] ?? 0) - tx.amount  // step back in time
    }
    return result
  }, [accounts, txs, laterSums])
}

// ─── Investment account history ──────────────────────────────────────────────

/**
 * Returns 12 months of { month, invested, balance } for a single investment account.
 * - invested: net positive non-revaluation inflows that month (new money in)
 * - balance:  account balance at end of that month (includes market gains)
 */
export function useInvestmentAccountHistory(account: Account, months = 12) {
  const now   = new Date()
  const year  = getYear(now)
  const month = getMonth(now) + 1

  const startStr = format(new Date(year, month - months, 1), 'yyyy-MM-dd')

  return useQuery({
    queryKey: ['investment-history', account.id, year, month],
    queryFn: async () => {
      const { data } = await supabase
        .from('transactions')
        .select('amount, date, type, category, account_id, to_account_id')
        .or(`account_id.eq.${account.id},to_account_id.eq.${account.id}`)
        .gte('date', startStr)

      const txs = (data ?? []) as {
        amount: number; date: string; type: string; category: string
        account_id: number; to_account_id: number | null
      }[]

      // How a transaction affects THIS account's balance
      const effectOn = (tx: typeof txs[0]): number => {
        if (tx.account_id    === account.id) return tx.amount
        if (tx.to_account_id === account.id) return -tx.amount
        return 0
      }

      return Array.from({ length: months }, (_, i) => {
        const d        = new Date(year, month - months + i, 1)
        const monthKey = format(d, 'yyyy-MM')
        const nextStr  = format(new Date(d.getFullYear(), d.getMonth() + 1, 1), 'yyyy-MM-dd')

        // Sum of positive inflows this month = new money invested
        // Excludes: revaluations (market updates) + 'investment' category (Investment Return — dividends, etc.)
        const invested = txs
          .filter(tx => tx.date.startsWith(monthKey) && tx.type !== 'revaluation' && tx.category !== 'investment')
          .reduce((s, tx) => { const e = effectOn(tx); return e > 0 ? s + e : s }, 0)

        // Balance at month-end = current balance minus all effects that came AFTER this month
        const laterEffect = txs
          .filter(tx => tx.date >= nextStr)
          .reduce((s, tx) => s + effectOn(tx), 0)

        return { month: format(d, 'MMM yy'), invested, balance: account.balance - laterEffect }
      })
    },
    enabled: account.id != null,
  })
}

// ─── Mutations ───────────────────────────────────────────────────────────────
// Transactions affect account balances, so both caches are invalidated.
// Prefix-based invalidation on ['transactions'] covers byMonth + netFlow.

export async function addTransaction(data: Omit<Transaction, 'id' | 'createdAt'>) {
  await transactionsRepo.add(data)
  queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all() })
  queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all() })
  queryClient.invalidateQueries({ queryKey: ['benefits'] })
}

export async function updateTransaction(id: number, data: Partial<Transaction>) {
  await transactionsRepo.update(id, data)
  queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all() })
  queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all() })
  queryClient.invalidateQueries({ queryKey: ['benefits'] })
}

export async function removeTransaction(id: number) {
  await transactionsRepo.remove(id)
  queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all() })
  queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all() })
  queryClient.invalidateQueries({ queryKey: ['benefits'] })
}
