import { TrendingDown, TrendingUp } from 'lucide-react'
import { formatMoney } from '@/domain/money'
import { accountGradient } from '@/shared/utils/accountGradient'
import { useT } from '@/shared/i18n'
import BalanceValue from '@/shared/components/BalanceValue'
import PageHelpInfo from '@/shared/components/PageHelpInfo'

interface Props {
  title:              string
  totalInvestedBase:  number
  totalAdjustedCost:  number
  totalFees:          number
  totalMarketValue:   number
  totalPnL:           number
  totalPnLPct:        number
  accentColor?:       string
}

export default function PortfolioSummary({
  title,
  totalInvestedBase,
  totalAdjustedCost,
  totalFees,
  totalMarketValue,
  totalPnL,
  totalPnLPct,
  accentColor,
}: Props) {
  const t          = useT()
  const isPositive = totalPnL >= 0
  const colored    = !!accentColor

  const labelCls  = colored ? 'text-on-accent/60'    : 'text-muted-foreground'
  const valueCls  = colored ? 'text-on-accent'        : ''
  const titleCls  = colored ? 'text-on-accent/70'     : 'text-muted-foreground'
  const pnlCls    = isPositive
    ? (colored ? 'text-emerald-700 dark:text-emerald-300' : 'text-emerald-600')
    : (colored ? 'text-rose-600 dark:text-rose-300'    : 'text-red-500')

  return (
    <section
      id="portfolio-summary"
      className="rounded-xl border bg-card p-5 shadow-sm"
      style={accentColor ? { background: accountGradient(accentColor), borderColor: 'transparent' } : undefined}
    >
      <div className="mb-3 flex items-center gap-1.5">
        <p className={`text-sm font-semibold uppercase tracking-wide ${titleCls}`}>{title}</p>
        <PageHelpInfo title={t('investments.sections.portfolioSummary.title')} body={t('investments.sections.portfolioSummary.body')} />
      </div>
      <BalanceValue>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {totalInvestedBase > 0 && (
            <div>
              <p className={`text-xs ${labelCls}`}>{t('investments.investedBase')}</p>
              <p className={`text-lg font-bold tabular-nums ${valueCls}`}>{formatMoney(totalInvestedBase)}</p>
            </div>
          )}
          <div>
            <p className={`text-xs ${labelCls}`}>{t('investments.costBasis')}</p>
            <p className={`text-lg font-bold tabular-nums ${valueCls}`}>{formatMoney(totalAdjustedCost)}</p>
            {totalFees > 0 && <p className={`text-xs ${labelCls}`}>incl. {formatMoney(totalFees)} fees</p>}
          </div>
          <div>
            <p className={`text-xs ${labelCls}`}>{t('investments.marketValue')}</p>
            <p className={`text-lg font-bold tabular-nums ${valueCls}`}>{formatMoney(totalMarketValue)}</p>
          </div>
          <div>
            <p className={`text-xs ${labelCls}`}>{t('investments.pnl')}</p>
            <div className={`text-lg font-bold tabular-nums ${pnlCls}`}>
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
      </BalanceValue>
    </section>
  )
}
