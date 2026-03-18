import { TrendingDown, TrendingUp } from 'lucide-react'
import { formatMoney } from '@/domain/money'
import { useT } from '@/shared/i18n'

interface Props {
  title: string
  totalInvestedBase: number
  totalAdjustedCost: number
  totalFees: number
  totalMarketValue: number
  totalPnL: number
  totalPnLPct: number
}

export default function PortfolioSummary({
  title,
  totalInvestedBase,
  totalAdjustedCost,
  totalFees,
  totalMarketValue,
  totalPnL,
  totalPnLPct,
}: Props) {
  const t = useT()
  const isPositive = totalPnL >= 0

  return (
    <section
      id="portfolio-summary"
      className="rounded-xl border bg-card p-5 shadow-sm"
    >
      <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {totalInvestedBase > 0 && (
          <div>
            <p className="text-xs text-muted-foreground">{t('investments.investedBase')}</p>
            <p className="text-lg font-bold tabular-nums">{formatMoney(totalInvestedBase)}</p>
          </div>
        )}
        <div>
          <p className="text-xs text-muted-foreground">{t('investments.costBasis')}</p>
          <p className="text-lg font-bold tabular-nums">{formatMoney(totalAdjustedCost)}</p>
          {totalFees > 0 && <p className="text-xs text-muted-foreground">incl. {formatMoney(totalFees)} fees</p>}
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{t('investments.marketValue')}</p>
          <p className="text-lg font-bold tabular-nums">{formatMoney(totalMarketValue)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{t('investments.pnl')}</p>
          <div className={`text-lg font-bold tabular-nums ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
            <p className="flex items-center gap-1">
            {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            {isPositive ? '+' : ''}{formatMoney(totalPnL)}
            </p>
            <p className="text-sm sm:mt-0">
              {isPositive ? '+' : ''}{totalPnLPct.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
