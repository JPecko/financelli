import { useMemo } from 'react'
import { useBudgets } from '@/shared/hooks/useBudgets'
import { useCategorySpending } from '@/shared/hooks/useCategorySpending'
import { useRecurringRules } from '@/shared/hooks/useRecurringRules'
import { useAccounts } from '@/shared/hooks/useAccounts'
import { buildBudgetRows, budgetStatus, pendingRecurringByCategory } from '@/domain/budgets'
import { monthEndDate, type YearMonth } from '@/domain/netWorth'
import { isoToday } from '@/shared/utils/format'

export function isCurrentYearMonth({ year, month }: YearMonth) {
  const now = new Date()
  return year === now.getFullYear() && month === now.getMonth() + 1
}

// Share of the month already elapsed, used as the "today" marker on progress bars
function monthElapsedPct({ year, month }: YearMonth) {
  if (!isCurrentYearMonth({ year, month })) return null
  const today = new Date()
  return Math.round((today.getDate() / new Date(year, month, 0).getDate()) * 100)
}

/** Budget rows and totals for one month; projections only apply to the current month. */
export function useBudgetOverview(ym: YearMonth) {
  const { data: budgets = [], isLoading: budgetsLoading } = useBudgets()
  const { spending, isLoading: spendingLoading } = useCategorySpending(ym.year, ym.month)
  const { data: rules = [] } = useRecurringRules()
  const { data: accounts = [] } = useAccounts()
  const isCurrent = isCurrentYearMonth(ym)

  const rows = useMemo(() => {
    const pending = isCurrent ? pendingRecurringByCategory(rules, accounts, isoToday(), monthEndDate(ym)) : {}
    return buildBudgetRows(budgets, spending, pending)
    // ym is covered by its primitive parts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [budgets, spending, rules, accounts, isCurrent, ym.year, ym.month])

  const summary = useMemo(() => {
    const limit     = rows.reduce((s, r) => s + r.budget.amountCents, 0)
    const spent     = rows.reduce((s, r) => s + r.spent, 0)
    const projected = rows.reduce((s, r) => s + r.projected, 0)
    return {
      limit, spent, projected,
      pct:        limit > 0 ? Math.round((spent / limit) * 100) : 0,
      status:     budgetStatus(spent, limit),
      elapsedPct: monthElapsedPct(ym),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, ym.year, ym.month])

  return { budgets, spending, rows, summary, isCurrent, isLoading: budgetsLoading || spendingLoading }
}
