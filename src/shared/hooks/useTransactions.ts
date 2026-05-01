import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getYear, getMonth, format } from 'date-fns'
import { supabase } from '@/data/supabase'
import { transactionsRepo } from '@/data/repositories/transactionsRepo'
import { groupsRepo } from '@/data/repositories/groupsRepo'
import { queryClient } from '@/app/queryClient'
import { queryKeys } from '@/data/queryKeys'
import { useAccounts } from '@/shared/hooks/useAccounts'
import { useSharedExpensesByMonth } from '@/shared/hooks/useSharedExpenses'
import { useMyGroupExpenses } from '@/shared/hooks/useGroups'
import { useAuth } from '@/features/auth/AuthContext'
import { effectOnInvestmentAccount } from '@/features/investments/utils/investmentMetrics'
import type { Transaction, Account } from '@/domain/types'

// ─── Queries ────────────────────────────────────────────────────────────────

export function useTransactionsByMonth(year: number, month: number) {
  return useQuery({
    queryKey: queryKeys.transactions.byMonth(year, month),
    queryFn:  () => transactionsRepo.getByMonth(year, month),
  })
}

export function useInvestmentCapitalAdjustments(accountIds: number[]) {
  const accountIdsKey = accountIds.slice().sort((a, b) => a - b).join(',')

  return useQuery({
    queryKey: queryKeys.transactions.capitalAdjustments(accountIdsKey),
    enabled: accountIds.length > 0,
    queryFn: async () => {
      const clauses = accountIds.flatMap(id => [`account_id.eq.${id}`, `to_account_id.eq.${id}`])
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .in('category', ['capital', 'invest-move'])
        .or(clauses.join(','))

      if (error) throw error

      const txs = (data ?? []) as {
        id: number
        account_id: number
        to_account_id: number | null
        amount: number
        type: string
        category: string
        description: string
        date: string
        recurring_rule_id: number | null
        is_personal: boolean
        split_n: number | null
        is_reimbursable: boolean
        personal_user_id: string | null
        holding_id: number | null
        units: number | null
        created_at: string
      }[]

      const mapped = txs.map(tx => ({
        id: tx.id,
        accountId: tx.account_id,
        toAccountId: tx.to_account_id ?? undefined,
        amount: tx.amount,
        type: tx.type as Transaction['type'],
        category: tx.category,
        description: tx.description,
        date: tx.date,
        recurringRuleId: tx.recurring_rule_id ?? undefined,
        isPersonal: tx.is_personal ?? false,
        splitN: tx.split_n ?? null,
        isReimbursable: tx.is_reimbursable ?? false,
        personalUserId: tx.personal_user_id ?? undefined,
        holdingId: tx.holding_id ?? undefined,
        units: tx.units ?? undefined,
        createdAt: tx.created_at,
      }) satisfies Transaction)

      return Object.fromEntries(accountIds.map(accountId => [
        accountId,
        mapped.reduce((sum, tx) => sum + effectOnInvestmentAccount(tx, accountId), 0),
      ]))
    },
  })
}

/** Fetches personal income, expenses, investing and roundup for the 6 months ending at (year, month). */
export function useMonthlyNetFlow(year: number, month: number) {
  const { user }                = useAuth()
  const { data: accounts = [] } = useAccounts()
  const userId = user?.id

  return useQuery({
    queryKey: queryKeys.transactions.netFlow(year, month),
    queryFn:  async () => {
      const divisorFor = (t: Transaction) => personalDivisorFor(t, userId, accounts)

      const result: { month: string; income: number; expenses: number; investing: number; roundup: number; net: number }[] = []
      for (let i = 5; i >= 0; i--) {
        const d    = new Date(year, month - 1 - i, 1)
        const all  = await transactionsRepo.getByMonth(getYear(d), getMonth(d) + 1)
        const groupExp = await groupsRepo.getMyGroupExpensesForMonth(getYear(d), getMonth(d) + 1)
        const INVESTING_CATS = new Set(['investing', 'invest-move', 'capital'])
        const cash = all.filter(isCashFlow)
        const income    = cash.filter(t => t.amount > 0).reduce((s, t) => s + t.amount / divisorFor(t), 0)
        const investMoves = all.filter(t => t.type === 'transfer' && t.category === 'invest-move' && t.amount < 0)
        const groupInvestingAmt = groupExp.filter(g => INVESTING_CATS.has(g.category)).reduce((s, g) => s + g.myShare, 0)
        const investing = [
          ...cash.filter(t => t.amount < 0 && (t.category === 'investing' || t.category === 'invest-move')),
          ...investMoves,
        ].reduce((s, t) => s + Math.abs(t.amount) / divisorFor(t), 0) + groupInvestingAmt
        const roundup   = cash.filter(t => t.amount < 0 && t.category === 'roundup').reduce((s, t) => s + Math.abs(t.amount) / divisorFor(t), 0)
        // Settlement outflows: real cash paid from a linked account to settle group debts.
        // isReimbursable=true+category='transfer'+amount<0 uniquely identifies these transactions.
        // They are excluded by divisorFor (Infinity) to avoid double-counting with myShare in
        // useMonthSummary, but the bar chart should reflect the actual cash movement.
        const settlementOutflows = all
          .filter(t => t.isReimbursable && t.category === 'transfer' && t.amount < 0)
          .reduce((s, t) => {
            const divisor = t.splitN ?? accounts.find(a => a.id === t.accountId)?.participants ?? 1
            return s + Math.abs(t.amount) / divisor
          }, 0)
        const expenses  = cash.filter(t => t.amount < 0 && t.category !== 'investing' && t.category !== 'roundup' && t.category !== 'invest-move').reduce((s, t) => s + Math.abs(t.amount) / divisorFor(t), 0) + settlementOutflows
        result.push({ month: format(d, 'MMM yy'), income, expenses, investing, roundup, net: income - expenses - investing - roundup })
      }
      return result
    },
  })
}

// ─── Derived / computed hooks ────────────────────────────────────────────────

/** Computes the personal divisor for a transaction. Returns Infinity to exclude from personal stats. */
export function personalDivisorFor(
  tx: Transaction,
  currentUserId: string | undefined,
  accounts: Account[],
): number {
  if (tx.isReimbursable) return Infinity
  // Expense assigned to a specific user in a shared account
  if (tx.personalUserId != null) {
    return tx.personalUserId === currentUserId ? 1 : Infinity
  }
  // Legacy isPersonal (not shared, but no specific user assigned)
  if (tx.isPersonal) return 1
  return tx.splitN ?? accounts.find(a => a.id === tx.accountId)?.participants ?? 1
}

/** Returns true for transactions that represent real cash flow (not internal moves or capital gains). */
export function isCashFlow(t: Transaction): boolean {
  if (t.type === 'revaluation') return false
  if (t.type === 'transfer' && t.toAccountId != null) return false
  if (t.type === 'transfer' && (t.category === 'capital' || t.category === 'invest-move')) return false
  return true
}

/** Computes monthly income/expense summary, dividing shared-account values by participants. */
export function useMonthSummary(year: number, month: number) {
  const { user }                       = useAuth()
  const { data: txs            = [] } = useTransactionsByMonth(year, month)
  const { data: accounts       = [] } = useAccounts()
  const { data: sharedExpenses = [] } = useSharedExpensesByMonth(year, month)
  const { data: groupExpenses  = [] } = useMyGroupExpenses(year, month)

  const real         = txs.filter(isCashFlow)
  const income       = real.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0)
  const expenses     = real.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0)
  const coreExpenses = real.filter(t => t.amount < 0 && t.category !== 'investing' && t.category !== 'roundup').reduce((s, t) => s + t.amount, 0)

  const divisorFor = (t: Transaction) => personalDivisorFor(t, user?.id, accounts)

  // payer='me' SEs: map transactionId → SE for personal cost override
  const txSeMap: Record<number, typeof sharedExpenses[0]> = {}
  for (const se of sharedExpenses) {
    if (se.payer === 'me' && se.transactionId != null) txSeMap[se.transactionId] = se
  }

  // Personal amount for an expense transaction:
  // if it has a linked SE (payer='me'), use se.myShare (negative) instead of tx.amount/divisor
  const personalAmountOf = (t: Transaction): number => {
    if (t.id != null && txSeMap[t.id] != null) return -txSeMap[t.id].myShare
    return t.amount / divisorFor(t)
  }

  // Shared expenses where someone else paid — add to personal expenses (consumption without cashflow)
  const sharedPersonal = sharedExpenses
    .filter(se => se.payer === 'other' && se.status !== 'ignored')
    .reduce((s, se) => s + se.myShare, 0)

  const sharedPending = sharedExpenses
    .filter(se => se.payer === 'other' && se.status === 'open')
    .reduce((s, se) => s + se.myShare, 0)

  // Group entries where someone else paid — user's share counts as personal expense.
  // myShare counts as a personal expense regardless of who paid.
  // When paidByMe=true, the linked bank tx has isReimbursable=true → contributes 0 via personalAmountOf,
  // so there is no double-counting. Investment-category entries are excluded here
  // and counted in personalInvesting instead.
  const INVESTING_CATEGORIES = new Set(['investing', 'invest-move', 'capital'])
  const groupPersonal = groupExpenses
    .filter(g => !INVESTING_CATEGORIES.has(g.category))
    .reduce((s, g) => s + g.myShare, 0)
  const groupInvesting = groupExpenses
    .filter(g => INVESTING_CATEGORIES.has(g.category))
    .reduce((s, g) => s + g.myShare, 0)

  const investMoveOutflows = txs.filter(t => t.type === 'transfer' && t.category === 'invest-move' && t.amount < 0)

  const personalExpenses = [
    ...real.filter(t => t.amount < 0),
    ...investMoveOutflows,
  ].reduce((s, t) => s + personalAmountOf(t), 0) - sharedPersonal - groupPersonal - groupInvesting

  const personalIncome = real
    .filter(t => t.amount > 0)
    .reduce((s, t) => s + t.amount / divisorFor(t), 0)

  const personalInvesting = [
    ...real.filter(t => t.amount < 0 && (t.category === 'investing' || t.category === 'invest-move')),
    ...txs.filter(t => t.type === 'transfer' && t.category === 'invest-move' && t.amount < 0),
  ].reduce((s, t) => s + personalAmountOf(t), 0) - groupInvesting

  const personalRoundup = real
    .filter(t => t.amount < 0 && t.category === 'roundup')
    .reduce((s, t) => s + personalAmountOf(t), 0)

  const marketGain = txs
    .filter(t => t.type === 'revaluation')
    .reduce((s, t) => s + t.amount, 0)

  return {
    income, expenses, coreExpenses, balance: income + expenses,
    personalIncome, personalExpenses, personalBalance: personalIncome + personalExpenses,
    personalInvesting, personalRoundup,
    marketGain, sharedPending,
    groupExpenses,
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
    queryKey: queryKeys.transactions.investmentHistory(account.id!, year, month, months),
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

        // Capital invested this month: explicit capital adjustments + invest-move transfers in.
        const invested = txs
          .filter(tx => tx.date.startsWith(monthKey) && (tx.category === 'capital' || tx.category === 'invest-move'))
          .reduce((s, tx) => s + effectOn(tx), 0)

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

export async function addTransaction(data: Omit<Transaction, 'id' | 'createdAt'>): Promise<number | undefined> {
  const id = await transactionsRepo.add(data)
  queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all() })
  queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all() })
  queryClient.invalidateQueries({ queryKey: queryKeys.holdings.all() })
  queryClient.invalidateQueries({ queryKey: ['benefits'] })
  return id
}

export async function updateTransaction(id: number, data: Partial<Transaction>) {
  await transactionsRepo.update(id, data)
  queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all() })
  queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all() })
  queryClient.invalidateQueries({ queryKey: queryKeys.holdings.all() })
  queryClient.invalidateQueries({ queryKey: ['benefits'] })
}

export async function removeTransaction(id: number) {
  await transactionsRepo.remove(id)
  queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all() })
  queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all() })
  queryClient.invalidateQueries({ queryKey: queryKeys.holdings.all() })
  queryClient.invalidateQueries({ queryKey: ['benefits'] })
}
