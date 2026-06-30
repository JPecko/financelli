import { useMemo } from 'react'
import {
  ComposedChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as ReTooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { usePurchaseHistoryByAccount, useAssetPricesByAssets } from '@/shared/hooks/usePurchaseHistory'
import { buildHistoryChartData } from '../utils/historyChartHelpers'
import { formatMoney } from '@/domain/money'
import { chartTooltipStyle, chartTooltipLabelStyle } from '@/shared/utils/chartStyle'
import type { Asset } from '@/domain/types'

interface Props {
  accountId:   number
  accountName: string
  assetMap:    Record<number, Asset>
}

const fmtAxis = (v: number) => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}k`
  return `${v}`
}

const fmtEur = (v: number) => formatMoney(Math.round(v * 100))

export default function InvestmentHistoryChart({ accountId, accountName, assetMap }: Props) {
  const { data: purchases = [] } = usePurchaseHistoryByAccount(accountId)

  const assetIds = useMemo(
    () => [...new Set(purchases.map(p => p.assetId))],
    [purchases],
  )

  const { data: allPrices = [] } = useAssetPricesByAssets(assetIds)

  const chartData = useMemo(
    () => buildHistoryChartData(purchases, assetMap, allPrices),
    [purchases, assetMap, allPrices],
  )

  const last      = chartData.length > 0 ? chartData[chartData.length - 1] : null
  const pnl       = last ? last.value - last.invested : 0
  const pnlPct    = last && last.invested > 0 ? (pnl / last.invested) * 100 : 0
  const pnlColor  = pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'
  const gradId    = `hc-invested-${accountId}`
  const gradValId = `hc-value-${accountId}`

  const summaryCards = last ? [
    { label: 'Total Invested',   value: fmtEur(last.invested), cls: '' },
    { label: 'Market Value',     value: fmtEur(last.value),    cls: 'text-violet-600 dark:text-violet-400' },
    { label: 'P&L',              value: `${pnl >= 0 ? '+' : ''}${fmtEur(pnl)}`, cls: pnlColor },
    { label: 'Return',           value: `${pnl >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%`, cls: pnlColor },
  ] : []

  return (
    <section className="space-y-3 min-h-[22rem]">
      <div>
        <h2 className="text-base font-semibold">
          Portfolio History{accountName ? ` — ${accountName}` : ''}
        </h2>
        <p className="text-sm text-muted-foreground">Invested capital vs market value over time</p>
      </div>

      <div className="rounded-xl border bg-card p-4 space-y-4">
        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {summaryCards.map(c => (
            <div key={c.label} className="rounded-lg bg-background px-3 py-2">
              <p className="text-[11px] text-muted-foreground">{c.label}</p>
              <p className={`text-sm font-semibold mt-0.5 ${c.cls}`}>{c.value}</p>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="h-52 md:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--color-muted-foreground)" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="var(--color-muted-foreground)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id={gradValId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#7c3aed" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                width={48}
                tickFormatter={fmtAxis}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <ReTooltip
                contentStyle={chartTooltipStyle}
                labelStyle={chartTooltipLabelStyle}
                formatter={(v, name) => [fmtEur(Number(v)), String(name)]}
              />
              <Legend
                verticalAlign="top"
                height={28}
                wrapperStyle={{ fontSize: 12 }}
              />

              <Area
                type="monotone"
                dataKey="invested"
                name="Invested"
                stroke="var(--muted-foreground)"
                strokeWidth={1.5}
                fill={`url(#${gradId})`}
                dot={false}
                strokeDasharray="4 3"
              />
              <Area
                type="monotone"
                dataKey="value"
                name="Market Value"
                stroke="#7c3aed"
                strokeWidth={2}
                fill={`url(#${gradValId})`}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  )
}
