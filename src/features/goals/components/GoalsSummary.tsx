import { Card, CardContent } from '@/shared/components/ui/card'
import BalanceValue from '@/shared/components/BalanceValue'
import { formatMoney } from '@/domain/money'
import { useT } from '@/shared/i18n'
import GoalProgressBar from './GoalProgressBar'

interface Props {
  totals: { saved: number; target: number; pct: number; count: number }
}

export default function GoalsSummary({ totals }: Props) {
  const t = useT()
  return (
    <Card>
      <CardContent className="space-y-2 pt-4">
        <p className="text-sm text-muted-foreground">{t('goals.summary', { count: String(totals.count) })}</p>
        <div className="flex items-end justify-between gap-2">
          <BalanceValue>
            <p className="tabular-nums">
              <span className="text-xl font-bold">{formatMoney(totals.saved)}</span>
              <span className="text-sm text-muted-foreground"> {t('goals.of')} {formatMoney(totals.target)}</span>
            </p>
          </BalanceValue>
          <span className="font-semibold tabular-nums">{totals.pct}%</span>
        </div>
        <GoalProgressBar pct={totals.pct} status={totals.pct >= 100 ? 'reached' : 'open'} className="h-2.5" />
      </CardContent>
    </Card>
  )
}
