import { cn } from '@/lib/utils'
import { STATUS_FILL } from '../utils/budgetStatusStyles'
import type { BudgetStatus } from '@/domain/budgets'

interface Props {
  pct:         number
  status:      BudgetStatus
  markerPct?:  number | null  // share of the month elapsed
  className?:  string
}

export default function BudgetProgressBar({ pct, status, markerPct, className }: Props) {
  return (
    <div className={cn('relative h-2 rounded-full bg-muted', className)}>
      <div className={cn('h-full rounded-full transition-all', STATUS_FILL[status])} style={{ width: `${Math.min(pct, 100)}%` }} />
      {markerPct != null && (
        <div className="absolute -top-1 -bottom-1 w-0.5 rounded-full bg-foreground/50" style={{ left: `${markerPct}%` }} />
      )}
    </div>
  )
}

