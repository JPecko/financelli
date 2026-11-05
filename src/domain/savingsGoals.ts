import { addMonths, differenceInCalendarMonths, format, parseISO } from 'date-fns'
import { monthEndDate, type NetWorthMonth } from './netWorth'
import { contributionsFutureValue, monthlyRate, projectInvestment, type InvestmentGrowth } from './investmentGrowth'
import type { Account, SavingsGoal } from './types'

// Months of history (incl. the current one) used to measure the saving pace
export const GOAL_PACE_MONTHS = 6

export type GoalStatus = 'reached' | 'onTrack' | 'behind' | 'open'

export type GoalProgress = {
  goal:            SavingsGoal
  isForecast:      boolean        // no target amount: `target` is the projected balance at the target date
  target:          number         // the goal's amount, or the projection for forecast-only goals
  current:         number
  remaining:       number
  pct:             number
  pace:            number | null  // monthly saving: cash accounts' average change + average investment deposits
  growthPct:       number | null  // value-weighted annual return of the linked investment accounts
  requiredMonthly: number | null  // only with a target date
  monthsLeft:      number | null  // only with a target date; 0 when overdue
  etaDate:         string | null  // YYYY-MM-DD; only without a target date
  status:          GoalStatus
}

// Projections stop here; beyond it the goal has no estimated date
const MAX_ETA_MONTHS = 600

export function goalBalance(accountIds: number[], balances: Record<number, number>) {
  return accountIds.reduce((s, id) => s + (balances[id] ?? 0), 0)
}

/** Average monthly change of the linked cash accounts, from months where every one of them already existed. */
export function goalMonthlyPace(goal: SavingsGoal, accounts: Account[], months: NetWorthMonth[]): number | null {
  const linked = accounts.filter(a => a.id != null && a.type !== 'investment' && goal.accountIds.includes(a.id))
  if (linked.length === 0) return null
  const ids        = linked.map(a => a.id!)
  const firstValid = linked.map(a => a.createdAt.slice(0, 10)).sort().at(-1)!
  const points = months
    .map((m, i) => ({ i, end: monthEndDate(m), m }))
    .filter(({ end, m }) => end >= firstValid && ids.every(id => m.balances[id] != null))
  if (points.length < 2) return null
  const first = points[0]
  const last  = points[points.length - 1]
  return (goalBalance(ids, last.m.balances) - goalBalance(ids, first.m.balances)) / (last.i - first.i)
}

function statusFor(remaining: number, overdue: boolean, onTrack: boolean | null): GoalStatus {
  if (remaining <= 0) return 'reached'
  if (overdue) return 'behind'
  if (onTrack == null) return 'open'
  return onTrack ? 'onTrack' : 'behind'
}

// Contribution needed per month: monthly deposits earn the investments' rate in proportion to their share
function requiredContribution(target: number, cash: number, investments: InvestmentGrowth[], months: number) {
  const n         = Math.max(months, 1)
  const invValue  = investments.reduce((s, g) => s + g.value, 0)
  const grownBase = cash + investments.reduce((s, g) => s + projectInvestment({ ...g, monthlyContrib: 0 }, n), 0)
  const gap       = Math.max(target - grownBase, 0)
  const total     = cash + invValue
  const share     = total > 0 ? Math.max(invValue, 0) / total : investments.length > 0 ? 1 : 0
  const rate      = monthlyRate((weightedReturnPct(investments) ?? 0) * share)
  return Math.round(gap / contributionsFutureValue(1, rate, n))
}

function weightedReturnPct(investments: InvestmentGrowth[]) {
  if (investments.length === 0) return null
  const total = investments.reduce((s, g) => s + Math.max(g.value, 0), 0)
  if (total <= 0) return investments[0].annualReturnPct
  return investments.reduce((s, g) => s + g.annualReturnPct * Math.max(g.value, 0), 0) / total
}

/** Progress and forecast: cash grows at its historical pace, investments compound with their average deposits. */
export function buildGoalProgress(
  goal: SavingsGoal,
  current: number,
  cashPace: number | null,
  investments: InvestmentGrowth[],
  today: Date,
): GoalProgress {
  const cash    = current - investments.reduce((s, g) => s + g.value, 0)
  const hasPace = cashPace != null || investments.length > 0
  const pace    = hasPace ? (cashPace ?? 0) + investments.reduce((s, g) => s + g.monthlyContrib, 0) : null
  const project = (n: number) => cash + (cashPace ?? 0) * n + investments.reduce((s, g) => s + projectInvestment(g, n), 0)

  const monthsLeft = goal.targetDate ? Math.max(differenceInCalendarMonths(parseISO(goal.targetDate), today), 0) : null
  const base = { goal, current, pace, growthPct: weightedReturnPct(investments), monthsLeft }

  // Forecast only: without history the projection is today's balance (plus investment growth) and adapts as money comes in
  if (goal.targetCents == null) {
    const target = Math.round(Math.max(project(monthsLeft ?? 0), 0))
    return {
      ...base, isForecast: true, target, remaining: Math.max(target - current, 0), pct: pctOf(current, target),
      requiredMonthly: null, etaDate: null, status: 'open',
    }
  }

  const target          = goal.targetCents
  const remaining       = Math.max(target - current, 0)
  const overdue         = goal.targetDate != null && goal.targetDate < format(today, 'yyyy-MM-dd')
  const requiredMonthly = monthsLeft != null ? requiredContribution(target, cash, investments, monthsLeft) : null
  const onTrack         = monthsLeft != null && hasPace ? project(Math.max(monthsLeft, 1)) >= target : null

  let etaDate: string | null = null
  if (!goal.targetDate && remaining > 0 && hasPace) {
    const months = Array.from({ length: MAX_ETA_MONTHS }, (_, i) => i + 1).find(n => project(n) >= target)
    if (months != null) etaDate = format(addMonths(today, months), 'yyyy-MM-dd')
  }

  return {
    ...base, isForecast: false, target, remaining, pct: pctOf(current, target),
    requiredMonthly, etaDate,
    status: statusFor(remaining, overdue, onTrack),
  }
}

function pctOf(current: number, target: number) {
  return target > 0 ? Math.max(Math.round((current / target) * 100), 0) : 0
}
