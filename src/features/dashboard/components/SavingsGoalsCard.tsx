import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { formatMoney } from '@/domain/money'
import { useT } from '@/shared/i18n'
import BalanceValue from '@/shared/components/BalanceValue'
import GoalProgressBar from '@/features/goals/components/GoalProgressBar'
import GoalHint from '@/features/goals/components/GoalHint'
import { useGoalsOverview } from '@/features/goals/hooks/useGoalsOverview'
import type { GoalProgress } from '@/domain/savingsGoals'

// Hidden until the user creates a goal, so it never clutters the dashboard
export default function SavingsGoalsCard({ className }: { className?: string }) {
  const t = useT()
  const { rows, isLoading } = useGoalsOverview()
  if (isLoading || rows.length === 0) return null

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{t('goals.title')}</CardTitle>
        <Button asChild variant="ghost" size="sm" className="h-8 gap-1 text-xs">
          <Link to="/goals">{t('goals.seeAll')} <ChevronRight className="h-3.5 w-3.5" /></Link>
        </Button>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map(row => <GoalItem key={row.goal.id} row={row} />)}
        </ul>
      </CardContent>
    </Card>
  )
}

function GoalItem({ row }: { row: GoalProgress }) {
  return (
    <li className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="truncate font-medium">{row.goal.name}</span>
        <BalanceValue>
          <span className="whitespace-nowrap tabular-nums text-muted-foreground">
            {formatMoney(row.current)} / {row.isForecast && '~'}{formatMoney(row.target)}
          </span>
        </BalanceValue>
      </div>
      <GoalProgressBar pct={row.pct} status={row.status} />
      <GoalHint row={row} />
    </li>
  )
}
