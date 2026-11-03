import type { BudgetStatus } from '@/domain/budgets'

export const STATUS_FILL: Record<BudgetStatus, string> = {
  ok:      'bg-emerald-500',
  warning: 'bg-amber-500',
  over:    'bg-rose-500',
}

export const STATUS_TEXT: Record<BudgetStatus, string> = {
  ok:      'text-emerald-600 dark:text-emerald-400',
  warning: 'text-amber-600 dark:text-amber-400',
  over:    'text-rose-600 dark:text-rose-400',
}
