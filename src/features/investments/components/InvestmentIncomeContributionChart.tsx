import { useMemo } from 'react'
import {
  ComposedChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as ReTooltip, ResponsiveContainer,
} from 'recharts'
import { useTransactionsByAccount } from '@/shared/hooks/useTransactions'
import { usePurchaseHistoryByAccount, useAssetPricesByAssets } from '@/shared/hooks/usePurchaseHistory'
import { filterIncomeContributions, matchContributionsToPurchases } from '../utils/incomeContributionHelpers'
import { buildHistoryChartData } from '../utils/historyChartHelpers'
import { formatMoney } from '@/domain/money'
import { useT } from '@/shared/i18n'
import { chartTooltipStyle, chartTooltipLabelStyle } from '@/shared/utils/chartStyle'
import type { Asset } from '@/domain/types'

interface Props {
  accountId: number
  assetMap: Record<number, Asset>
}

const fmtAxis = (v: number) => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}k`
  return `${v}`
}

const fmtEur = (v: number) => formatMoney(Math.round(v * 100))

export default function InvestmentIncomeContributionChart({ accountId, assetMap }: Props) {
  const t = useT()
  const { data: transactions = [] } = useTransactionsByAccount(accountId)
  const { data: purchases = [] }    = usePurchaseHistoryByAccount(accountId)

  const contributions = useMemo(() => filterIncomeContributions(transactions, accountId), [transactions, accountId])

  const { matchedPurchases, unmatched } = useMemo(
    () => matchContributionsToPurchases(contributions, purchases),
    [contributions, purchases],
  )

  const assetIds = useMemo(() => [...new Set(matchedPurchases.map(p => p.assetId))], [matchedPurchases])
  const { data: allPrices = [] } = useAssetPricesByAssets(assetIds)

  const chartData = useMemo(
    () => buildHistoryChartData(matchedPurchases, assetMap, allPrices),
    [matchedPurchases, assetMap, allPrices],
  )

  // Only relevant when this account actually has income tagged as an investment move
  if (contributions.length === 0) return null

  const last     = chartData.length > 0 ? chartData[chartData.length - 1] : null
  const pnl      = last ? last.value - last.invested : 0
  const pnlPct   = last && last.invested > 0 ? (pnl / last.invested) * 100 : 0
  const pnlColor = pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'
  const gradId    = `ic-invested-${accountId}`
  const gradValId = `ic-value-${accountId}`

  const summaryCards = last ? [
    { label: t('investments.incomeContribTotal'), value: fmtEur(last.invested), cls: '' },
    { label: t('investments.marketValue'),         value: fmtEur(last.value),    cls: 'text-violet-600 dark:text-violet-400' },
    { label: t('investments.pnl'),                 value: `${pnl >= 0 ? '+' : ''}${fmtEur(pnl)}`, cls: pnlColor },
    { label: t('investments.forecastReturn'),       value: `${pnl >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%`, cls: pnlColor },
  ] : []

  return (
    <section className="space-y-3 min-h-[22rem]">
      <div>
        <h2 className="text-base font-semibold">{t('investments.incomeContribTitle')}</h2>
        <p className="text-sm text-muted-foreground">{t('investments.incomeContribSubtitle')}</p>
      </div>

      <div className="rounded-xl border bg-card p-4 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {summaryCards.map(c => (
            <div key={c.label} className="rounded-lg bg-background px-3 py-2">
              <p className="text-[11px] text-muted-foreground">{c.label}</p>
              <p className={`text-sm font-semibold mt-0.5 ${c.cls}`}>{c.value}</p>
            </div>
          ))}
        </div>

        {chartData.length > 0 ? (
          <div className="h-52 md:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="var(--muted-foreground)" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="var(--muted-foreground)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id={gradValId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={16} />
                <YAxis width={38} tick={{ fontSize: 10 }} tickFormatter={fmtAxis} tickLine={false} axisLine={false} />
                <ReTooltip
                  formatter={(value, name) => [typeof value === 'number' ? fmtEur(value) : String(value ?? ''), String(name ?? '')]}
                  contentStyle={chartTooltipStyle}
                  labelStyle={chartTooltipLabelStyle}
                />
                <Area type="monotone" dataKey="invested" name={t('investments.incomeContribTotal')} stroke="var(--muted-foreground)" strokeWidth={1.5} strokeDasharray="4 3" fill={`url(#${gradId})`} dot={false} />
                <Area type="monotone" dataKey="value"    name={t('investments.marketValue')}         stroke="#8b5cf6" strokeWidth={2} fill={`url(#${gradValId})`} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t('investments.incomeContribUnmatchedOnly')}</p>
        )}

        {unmatched.length > 0 && (
          <div className="space-y-1 rounded-lg border border-dashed p-2.5">
            <p className="text-xs text-muted-foreground">
              {t('investments.incomeContribUnmatchedNote', { count: String(unmatched.length) })}
            </p>
            <ul className="space-y-0.5 text-[11px] text-muted-foreground/80">
              {unmatched.map(u => (
                <li key={u.date}>
                  {u.date} — {fmtEur(u.amountEuros)}
                  {u.nearestDate
                    ? ` · ${t('investments.incomeContribNearest', {
                        date: u.nearestDate, amount: fmtEur(u.nearestTotalEuros ?? 0), days: String(u.nearestDaysAway ?? 0),
                      })}`
                    : ` · ${t('investments.incomeContribNoPurchases')}`}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}
