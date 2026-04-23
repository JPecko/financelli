import { useState, useMemo } from 'react'
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as ReTooltip, ResponsiveContainer,
} from 'recharts'
import { Input } from '@/shared/components/ui/input'
import { formatDecimal } from '@/domain/money'
import { useT } from '@/shared/i18n'
import { buildForecastData } from '../utils/forecastHelpers'

const HORIZONS = [10, 20, 30] as const
type Horizon = typeof HORIZONS[number]

const fmtAxis = (v: number) => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`
  return `${v}`
}

interface Props {
  currentValueCents: number
  accountName?: string
  chartId?: string | number   // unique suffix for SVG gradient IDs when multiple instances render
}

export default function InvestmentForecastSection({ currentValueCents, accountName, chartId = 'global' }: Props) {
  const t = useT()
  const gNominal = `fg-nominal-${chartId}`
  const gReal    = `fg-real-${chartId}`

  const [returnStr,    setReturnStr]    = useState('7')
  const [inflationStr, setInflationStr] = useState('2')
  const [contribStr,   setContribStr]   = useState('0')
  const [horizon,      setHorizon]      = useState<Horizon>(20)

  const returnPct      = parseFloat(returnStr.replace(',', '.'))    || 0
  const inflationPct   = parseFloat(inflationStr.replace(',', '.')) || 0
  const monthlyContrib = parseFloat(contribStr.replace(',', '.'))   || 0

  const chartData = useMemo(
    () => buildForecastData(currentValueCents, returnPct, inflationPct, monthlyContrib, horizon),
    [currentValueCents, returnPct, inflationPct, monthlyContrib, horizon],
  )

  const finalPoint = chartData[chartData.length - 1]
  const summaryCards = [
    {
      label: t('investments.forecastNominal'),
      value: finalPoint ? formatDecimal(finalPoint.nominal) : '—',
      valueClassName: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: t('investments.forecastReal'),
      value: finalPoint ? formatDecimal(finalPoint.real) : '—',
      valueClassName: 'text-violet-600 dark:text-violet-400',
    },
    {
      label: t('investments.forecastInvested'),
      value: finalPoint ? formatDecimal(finalPoint.invested) : '—',
      valueClassName: '',
    },
  ]

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold">
          {t('investments.forecastTitle')}{accountName ? ` — ${accountName}` : ''}
        </h2>
        <p className="text-sm text-muted-foreground">{t('investments.forecastSubtitle')}</p>
      </div>

      <div className="rounded-xl border bg-card p-4 space-y-4">

        {/* Assumption inputs */}
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3 md:gap-3">
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">{t('investments.forecastReturn')}</span>
            <div className="relative">
              <Input
                type="text"
                inputMode="decimal"
                value={returnStr}
                onChange={e => setReturnStr(e.target.value)}
                className="pr-8"
              />
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
            </div>
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">{t('investments.forecastInflation')}</span>
            <div className="relative">
              <Input
                type="text"
                inputMode="decimal"
                value={inflationStr}
                onChange={e => setInflationStr(e.target.value)}
                className="pr-8"
              />
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
            </div>
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">{t('investments.forecastContribution')}</span>
            <div className="relative">
              <Input
                type="text"
                inputMode="decimal"
                value={contribStr}
                onChange={e => setContribStr(e.target.value)}
                className="pr-6"
              />
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">€</span>
            </div>
          </label>
        </div>

        {/* Horizon selector */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="shrink-0 text-xs text-muted-foreground">{t('investments.forecastHorizon')}:</span>
          <div className="flex flex-wrap gap-1.5">
            {HORIZONS.map(h => (
              <button
                key={h}
                type="button"
                onClick={() => setHorizon(h)}
                className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                  horizon === h
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/70'
                }`}
              >
                {h}{t('investments.forecastYears')}
              </button>
            ))}
          </div>
        </div>

        {/* Final-value summary */}
        <div className="grid grid-cols-1 gap-1.5 rounded-lg bg-muted/30 p-1.5 md:grid-cols-3 md:gap-2 md:p-2">
          {summaryCards.map(card => (
            <div
              key={card.label}
              className="min-w-0 rounded-md bg-background/80 px-2 py-2 text-left shadow-sm md:px-3 md:py-2"
            >
              <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground leading-tight">
                {card.label}
              </p>
              <p className={`mt-1 truncate text-lg font-semibold tabular-nums leading-tight md:text-base ${card.valueClassName}`}>
                {card.value}
              </p>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />
              <span className="truncate">{t('investments.forecastNominal')}</span>
            </span>
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full bg-violet-500" />
              <span className="truncate">{t('investments.forecastReal')}</span>
            </span>
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <span
                aria-hidden="true"
                className="h-0.5 w-3 shrink-0 rounded-full bg-muted-foreground"
              />
              <span className="truncate">{t('investments.forecastInvested')}</span>
            </span>
          </div>

          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={chartData} margin={{ top: 4, right: 0, bottom: 0, left: -10 }}>
              <defs>
                <linearGradient id={gNominal} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10b981" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id={gReal} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.14} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="year"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                minTickGap={16}
                tickMargin={8}
                tickFormatter={v => `${v}y`}
              />
              <YAxis
                width={38}
                tick={{ fontSize: 10 }}
                tickFormatter={fmtAxis}
                tickLine={false}
                axisLine={false}
              />
              <ReTooltip
                formatter={(value, name) => [
                  typeof value === 'number' ? formatDecimal(value) : String(value ?? ''),
                  String(name ?? ''),
                ]}
                labelFormatter={v => `Year ${v}`}
                contentStyle={{ fontSize: 12 }}
              />
              <Area
                type="monotone"
                dataKey="nominal"
                name={t('investments.forecastNominal')}
                stroke="#10b981"
                strokeWidth={2}
                fill={`url(#${gNominal})`}
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="real"
                name={t('investments.forecastReal')}
                stroke="#8b5cf6"
                strokeWidth={2}
                fill={`url(#${gReal})`}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="invested"
                name={t('investments.forecastInvested')}
                stroke="var(--muted-foreground)"
                strokeWidth={1.5}
                strokeDasharray="4 3"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

      </div>
    </section>
  )
}
