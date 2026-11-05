import { useMemo } from 'react'
import { useSavingsGoals } from '@/shared/hooks/useSavingsGoals'
import { useSortedAccounts } from '@/shared/hooks/useAccounts'
import { useEffectiveBalances } from '@/shared/hooks/useEffectiveBalances'
import { useNetWorthHistory } from '@/shared/hooks/useNetWorthHistory'
import { useInvestmentGrowth } from '@/shared/hooks/useInvestmentGrowth'
import { GOAL_PACE_MONTHS, buildGoalProgress, goalBalance, goalMonthlyPace } from '@/domain/savingsGoals'

const now   = new Date()
const today = { year: now.getFullYear(), month: now.getMonth() + 1 }

/** Progress of every savings goal: live balance of its accounts, plus pace from their monthly history. */
export function useGoalsOverview() {
  const { data: goals = [], isLoading: goalsLoading } = useSavingsGoals()
  const { data: accounts = [], isLoading: accLoading } = useSortedAccounts()
  const { balances, isLoading: balancesLoading } = useEffectiveBalances(accounts)
  const { months } = useNetWorthHistory(accounts, balances, today, GOAL_PACE_MONTHS)
  const { growth } = useInvestmentGrowth(accounts, balances)

  const rows = useMemo(() => goals.map(goal => {
    const current = goalBalance(goal.accountIds, balances)
    // Until history loads the cash pace is unknown, which only hides the forecast
    const cashPace    = goalMonthlyPace(goal, accounts, months)
    const investments = goal.accountIds.flatMap(id => growth[id] ? [growth[id]] : [])
    return buildGoalProgress(goal, current, cashPace, investments, new Date())
  }), [goals, accounts, balances, months, growth])

  const totals = useMemo(() => {
    // Forecast-only goals have no fixed amount, so they stay out of the totals
    const targeted = rows.filter(r => !r.isForecast)
    const saved  = targeted.reduce((s, r) => s + Math.min(r.current, r.target), 0)
    const target = targeted.reduce((s, r) => s + r.target, 0)
    return { saved, target, count: targeted.length, pct: target > 0 ? Math.round((saved / target) * 100) : 0 }
  }, [rows])

  return { goals, accounts, balances, rows, totals, isLoading: goalsLoading || accLoading || balancesLoading }
}
