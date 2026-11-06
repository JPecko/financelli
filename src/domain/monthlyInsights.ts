// Months before the current one used as the "usual" baseline
export const INSIGHT_HISTORY_MONTHS = 3

// Savings, perks and internal moves aren't spending worth flagging
const EXCLUDED = new Set(['investing', 'invest-move', 'capital', 'roundup', 'cashback', 'transfer'])
// Months with any spending needed before comparisons mean anything
const MIN_HISTORY_MONTHS = 2
// A category change must clear both to be shown
const MIN_CHANGE_PCT   = 25
const MIN_CHANGE_CENTS = 2500
const MAX_CATEGORY_INSIGHTS = 3
// An expense this many times the category's typical one (and at least this much) is unusual
const UNUSUAL_FACTOR      = 3
const MIN_UNUSUAL_CENTS   = 5000
const MIN_CATEGORY_SAMPLES = 3
const MAX_UNUSUAL = 2
// Percentage points the last month's savings rate must differ from the usual one
const MIN_SAVINGS_DELTA_PP = 5

export type InsightExpense = { key: string; description: string; category: string; date: string; amount: number } // amount: cents, negative

export type SavingsMonth = { month: string; income: number; net: number } // month: YYYY-MM

export type SpendingPace = { current: number; usual: number; deltaPct: number }

export type MonthlyInsight =
  | { kind: 'category'; category: string; current: number; usual: number; deltaPct: number }
  | { kind: 'unusual'; expense: InsightExpense; usual: number; factor: number }
  | { kind: 'savingsRate'; month: string; rate: number; usual: number }

export interface InsightInputs {
  spending:        Record<string, number>    // this month so far, per category
  historySpending: Record<string, number>[]  // same days of each previous month
  expenses:        InsightExpense[]          // this month so far
  historyExpenses: InsightExpense[]          // whole previous months
  savings:         SavingsMonth[]            // complete months, oldest first
}

function spendingOnly(spending: Record<string, number>) {
  return Object.entries(spending).filter(([cat]) => !EXCLUDED.has(cat))
}

function sumOf(spending: Record<string, number>) {
  return spendingOnly(spending).reduce((s, [, v]) => s + v, 0)
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

const pctChange = (current: number, usual: number) => Math.round(((current - usual) / usual) * 100)

function categoryInsights(spending: Record<string, number>, history: Record<string, number>[]): MonthlyInsight[] {
  const categories = new Set([...spendingOnly(spending), ...history.flatMap(spendingOnly)].map(([cat]) => cat))
  return [...categories]
    .map(category => {
      const current = Math.round(spending[category] ?? 0)
      const usual   = Math.round(history.reduce((s, h) => s + (h[category] ?? 0), 0) / history.length)
      return { kind: 'category' as const, category, current, usual, deltaPct: usual > 0 ? pctChange(current, usual) : 0 }
    })
    .filter(c => c.usual > 0 && Math.abs(c.current - c.usual) >= MIN_CHANGE_CENTS && Math.abs(c.deltaPct) >= MIN_CHANGE_PCT)
    .sort((a, b) => Math.abs(b.current - b.usual) - Math.abs(a.current - a.usual))
    .slice(0, MAX_CATEGORY_INSIGHTS)
}

function unusualInsights(expenses: InsightExpense[], history: InsightExpense[]): MonthlyInsight[] {
  const byCategory = new Map<string, number[]>()
  for (const e of history) byCategory.set(e.category, [...(byCategory.get(e.category) ?? []), -e.amount])
  return expenses
    .filter(e => !EXCLUDED.has(e.category) && -e.amount >= MIN_UNUSUAL_CENTS)
    .flatMap(expense => {
      const samples = byCategory.get(expense.category) ?? []
      if (samples.length < MIN_CATEGORY_SAMPLES) return []
      const usual  = Math.round(median(samples))
      const factor = usual > 0 ? -expense.amount / usual : 0
      return factor >= UNUSUAL_FACTOR ? [{ kind: 'unusual' as const, expense, usual, factor: Math.round(factor) }] : []
    })
    .sort((a, b) => a.expense.amount - b.expense.amount)
    .slice(0, MAX_UNUSUAL)
}

function savingsInsight(months: SavingsMonth[]): MonthlyInsight[] {
  const rates = months.filter(m => m.income > 0).map(m => ({ month: m.month, rate: Math.round((m.net / m.income) * 100) }))
  if (rates.length < MIN_HISTORY_MONTHS + 1) return []
  const last  = rates[rates.length - 1]
  const usual = Math.round(rates.slice(0, -1).reduce((s, r) => s + r.rate, 0) / (rates.length - 1))
  return Math.abs(last.rate - usual) >= MIN_SAVINGS_DELTA_PP ? [{ kind: 'savingsRate', month: last.month, rate: last.rate, usual }] : []
}

/** This month vs the usual one: overall pace, categories that moved, outlier expenses and the savings-rate trend. */
export function buildMonthlyInsights(inputs: InsightInputs): { pace: SpendingPace | null; insights: MonthlyInsight[] } {
  const history = inputs.historySpending.filter(h => sumOf(h) > 0)
  if (history.length < MIN_HISTORY_MONTHS) return { pace: null, insights: [] }

  const current = Math.round(sumOf(inputs.spending))
  const usual   = Math.round(history.reduce((s, h) => s + sumOf(h), 0) / history.length)
  const pace    = { current, usual, deltaPct: usual > 0 ? pctChange(current, usual) : 0 }

  return {
    pace,
    insights: [
      ...unusualInsights(inputs.expenses, inputs.historyExpenses),
      ...categoryInsights(inputs.spending, history),
      ...savingsInsight(inputs.savings),
    ],
  }
}
