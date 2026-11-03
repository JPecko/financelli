import { getCategoryById } from '@/domain/categories'
import type { BudgetRowData, BudgetStatus } from '@/domain/budgets'
import type { MonthlyReportBudgets } from '../pdf/monthlyReport.types'

interface BudgetTotals { limit: number; spent: number; pct: number; status: BudgetStatus }

export function buildReportBudgets(
  rows: BudgetRowData[], summary: BudgetTotals, categoryLabel: (id: string) => string,
): MonthlyReportBudgets | null {
  if (rows.length === 0) return null
  return {
    rows: rows.map(row => ({
      name:   categoryLabel(row.budget.category),
      color:  getCategoryById(row.budget.category).color,
      limit:  row.budget.amountCents,
      spent:  row.spent,
      pct:    row.pct,
      status: row.status,
    })),
    total: { limit: summary.limit, spent: summary.spent, pct: summary.pct, status: summary.status },
  }
}
