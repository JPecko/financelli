import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { formatMoney } from '@/domain/money'
import { useT } from '@/shared/i18n'
import BalanceValue from '@/shared/components/BalanceValue'
import BudgetProgressBar from './BudgetProgressBar'
import { STATUS_TEXT } from '../utils/budgetStatusStyles'
import type { BudgetStatus } from '@/domain/budgets'

interface Summary {
  limit: number; spent: number; projected: number; pct: number; status: BudgetStatus; elapsedPct: number | null
}

interface Props {
  summary:      Summary
  monthLabel:   string
  isCurrent:    boolean
  canGoBack:    boolean
  canGoForward: boolean
  goBack:       () => void
  goForward:    () => void
}

export default function BudgetSummaryCard({ summary, monthLabel, isCurrent, canGoBack, canGoForward, goBack, goForward }: Props) {
  const t = useT()
  const remaining = summary.limit - summary.spent

  return (
    <Card>
      <CardContent className="space-y-3 pt-4">
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" size="icon" className="h-9 w-9" disabled={!canGoBack} onClick={goBack} aria-label={t('dashboard.previousMonth')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium capitalize">{monthLabel}</span>
          <Button variant="ghost" size="icon" className="h-9 w-9" disabled={!canGoForward} onClick={goForward} aria-label={t('dashboard.nextMonth')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-end justify-between gap-2">
          <BalanceValue>
            <p className="text-lg tabular-nums">
              <span className="text-2xl font-bold">{formatMoney(summary.spent)}</span>
              <span className="text-muted-foreground"> {t('budgets.of')} {formatMoney(summary.limit)}</span>
            </p>
          </BalanceValue>
          <span className={`text-lg font-semibold tabular-nums ${STATUS_TEXT[summary.status]}`}>{summary.pct}%</span>
        </div>

        <BudgetProgressBar pct={summary.pct} status={summary.status} markerPct={summary.elapsedPct} className="h-3" />

        <BalanceValue>
          <p className="text-sm text-muted-foreground">
            {remaining >= 0
              ? t('budgets.remaining', { amount: formatMoney(remaining) })
              : t('budgets.overBy', { amount: formatMoney(-remaining) })}
            {isCurrent && ` · ${t('budgets.projected', { amount: formatMoney(summary.projected) })}`}
          </p>
        </BalanceValue>
      </CardContent>
    </Card>
  )
}
