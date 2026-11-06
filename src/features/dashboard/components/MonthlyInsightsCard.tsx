import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { formatMoney } from '@/domain/money'
import { useT } from '@/shared/i18n'
import { cn } from '@/lib/utils'
import BalanceValue from '@/shared/components/BalanceValue'
import PageHelpInfo from '@/shared/components/PageHelpInfo'
import InsightItem from './InsightItem'
import { useMonthlyInsights } from '../hooks/useMonthlyInsights'
import type { MonthlyInsight, SpendingPace } from '@/domain/monthlyInsights'

// Within this band the month is "in line" and the pace pill stays neutral
const NEUTRAL_PCT = 10

interface Props {
  onCategoryClick: (categoryId: string) => void
  className?:      string
}

// Hidden until there are at least two previous months to compare with
export default function MonthlyInsightsCard({ onCategoryClick, className }: Props) {
  const t = useT()
  const { pace, insights, isLoading } = useMonthlyInsights()
  if (isLoading || pace == null) return null

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-1.5">
          <CardTitle className="text-sm font-medium text-muted-foreground">{t('dashboard.insights.title')}</CardTitle>
          <PageHelpInfo title={t('dashboard.sections.insights.title')} body={t('dashboard.sections.insights.body')} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <PaceSummary pace={pace} />
        {insights.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('dashboard.insights.empty')}</p>
        ) : (
          <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            {insights.map(insight => (
              <InsightItem key={insightKey(insight)} insight={insight} onCategoryClick={onCategoryClick} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function PaceSummary({ pace }: { pace: SpendingPace }) {
  const t = useT()
  const tone = pace.deltaPct > NEUTRAL_PCT ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
    : pace.deltaPct < -NEUTRAL_PCT ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
    : 'bg-muted text-muted-foreground'
  const sign = pace.deltaPct > 0 ? '+' : pace.deltaPct < 0 ? '−' : ''

  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{t('dashboard.insights.soFar')}</p>
      <div className="flex flex-wrap items-center gap-2">
        <BalanceValue><span className="text-xl font-bold tabular-nums">{formatMoney(pace.current)}</span></BalanceValue>
        <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium tabular-nums', tone)}>
          {t('dashboard.insights.vsUsual', { pct: `${sign}${Math.abs(pace.deltaPct)}%` })}
        </span>
      </div>
      <BalanceValue>
        <p className="text-xs text-muted-foreground">{t('dashboard.insights.usual', { amount: formatMoney(pace.usual) })}</p>
      </BalanceValue>
    </div>
  )
}

function insightKey(insight: MonthlyInsight) {
  if (insight.kind === 'category') return `cat-${insight.category}`
  if (insight.kind === 'unusual') return `exp-${insight.expense.key}`
  return 'savings'
}
