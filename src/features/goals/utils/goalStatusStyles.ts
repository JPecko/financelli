import type { GoalStatus } from '@/domain/savingsGoals'

export const GOAL_FILL: Record<GoalStatus, string> = {
  reached: 'bg-emerald-500',
  onTrack: 'bg-emerald-500',
  behind:  'bg-amber-500',
  open:    'bg-primary',
}

export const GOAL_TEXT: Record<GoalStatus, string> = {
  reached: 'text-emerald-600 dark:text-emerald-400',
  onTrack: 'text-emerald-600 dark:text-emerald-400',
  behind:  'text-amber-600 dark:text-amber-400',
  open:    'text-muted-foreground',
}
