import { cn } from '@/lib/utils'
import { GOAL_FILL } from '../utils/goalStatusStyles'
import type { GoalStatus } from '@/domain/savingsGoals'

export default function GoalProgressBar({ pct, status, className }: { pct: number; status: GoalStatus; className?: string }) {
  return (
    <div className={cn('h-2 rounded-full bg-muted', className)}>
      <div className={cn('h-full rounded-full transition-all', GOAL_FILL[status])} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  )
}
