import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import { format, getDaysInMonth, subMonths } from 'date-fns'
import { transactionsRepo } from '@/data/repositories/transactionsRepo'
import { sharedExpensesRepo } from '@/data/repositories/sharedExpensesRepo'
import { groupsRepo } from '@/data/repositories/groupsRepo'
import { queryKeys } from '@/data/queryKeys'
import { useAccounts } from '@/shared/hooks/useAccounts'
import { useMonthlyNetFlow } from '@/shared/hooks/useTransactions'
import { useAuth } from '@/features/auth/AuthContext'
import { computeCategorySpending, personalExpenseItems } from '@/shared/utils/categorySpending'
import { buildMonthlyInsights, INSIGHT_HISTORY_MONTHS, type SavingsMonth } from '@/domain/monthlyInsights'
import type { GroupExpenseItem, SharedExpense, Transaction } from '@/domain/types'

type MonthData = { transactions: Transaction[]; sharedExpenses: SharedExpense[]; groupExpenses: GroupExpenseItem[] }

const today = new Date()
// Current month first, then the history months; same keys as the per-month hooks, so the cache is shared
const MONTHS = Array.from({ length: INSIGHT_HISTORY_MONTHS + 1 }, (_, i) => {
  const d = subMonths(today, i)
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
})
// Past months are compared up to the same day; on the last day of the month they count in full
const CUTOFF_DAY = today.getDate() === getDaysInMonth(today) ? 31 : today.getDate()

function upToCutoff(data: MonthData): MonthData {
  const keep = (date: string) => Number(date.slice(8, 10)) <= CUTOFF_DAY
  return {
    transactions:   data.transactions.filter(t => keep(t.date)),
    sharedExpenses: data.sharedExpenses.filter(s => keep(s.date)),
    groupExpenses:  data.groupExpenses.filter(g => keep(g.date)),
  }
}

/** This month so far vs the same days of the previous months, plus the savings-rate trend of complete months. */
export function useMonthlyInsights() {
  const { user } = useAuth()
  const { data: accounts = [] } = useAccounts()
  const { data: netFlow = [], isLoading: flowLoading } = useMonthlyNetFlow(MONTHS[0].year, MONTHS[0].month)

  const queries = useQueries({
    queries: MONTHS.flatMap(({ year, month }) => [
      { queryKey: queryKeys.transactions.byMonth(year, month),   queryFn: () => transactionsRepo.getByMonth(year, month) },
      { queryKey: queryKeys.sharedExpenses.byMonth(year, month), queryFn: () => sharedExpensesRepo.getByMonth(year, month) },
      { queryKey: ['myGroupExpenses', year, month],             queryFn: () => groupsRepo.getMyGroupExpensesForMonth(year, month), staleTime: 30_000 },
    ]),
  })
  const isLoading = flowLoading || queries.some(q => q.isLoading)
  const dataKey   = queries.map(q => q.dataUpdatedAt).join()

  const result = useMemo(() => {
    if (isLoading) return { pace: null, insights: [] }
    const months: MonthData[] = MONTHS.map((_, i) => ({
      transactions:   (queries[i * 3].data ?? []) as Transaction[],
      sharedExpenses: (queries[i * 3 + 1].data ?? []) as SharedExpense[],
      groupExpenses:  (queries[i * 3 + 2].data ?? []) as GroupExpenseItem[],
    }))
    const userId   = user?.id
    const spending = (d: MonthData) => computeCategorySpending({ ...d, accounts, userId })
    const expenses = (d: MonthData) => personalExpenseItems({ ...d, accounts, userId })
    const [current, ...history] = months

    // netFlow ends with the current month; the months before it are complete
    const savings: SavingsMonth[] = netFlow.slice(0, -1).map((m, i, all) => ({
      month:  format(subMonths(today, all.length - i), 'yyyy-MM'),
      income: m.income,
      net:    m.net,
    }))

    return buildMonthlyInsights({
      spending:        spending(current),
      historySpending: history.map(h => spending(upToCutoff(h))),
      expenses:        expenses(current),
      historyExpenses: history.flatMap(expenses),
      savings,
    })
    // dataKey stands in for the query results, which are a new array every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, dataKey, netFlow, accounts, user?.id])

  return { ...result, isLoading }
}
