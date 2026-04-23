import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as ReTooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { Input } from '@/shared/components/ui/input'
import { formatDecimal } from '@/domain/money'
import { useT } from '@/shared/i18n'
import { useInvestmentSimulator, HORIZON_PRESETS } from '../hooks/useInvestmentSimulator'
import TickerSuggestInput from './TickerSuggestInput'

const fmtAxis = (v: number) => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`
  return `${v}`
}

function InputField({
  label, value, onChange, suffix, inputMode = 'decimal',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  suffix: string
  inputMode?: 'decimal' | 'numeric'
}) {
  return (
    <label className="space-y-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="relative">
        <Input
          type="text"
          inputMode={inputMode}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="pr-8"
        />
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          {suffix}
        </span>
      </div>
    </label>
  )
}

export default function InvestmentSimulatorSection() {
  const t = useT()
  const {
    returnStr,    setReturnStr,
    inflationStr, setInflationStr,
    initialStr,   setInitialStr,
    monthlyStr,   setMonthlyStr,
    horizonStr,   setHorizonStr,
    ticker,       setTicker,
    chartData,
    finalPoint,
  } = useInvestmentSimulator()

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold">{t('investments.simulatorTitle')}</h2>
        <p className="text-sm text-muted-foreground">{t('investments.simulatorSubtitle')}</p>
      </div>

      <div className="rounded-xl border bg-card p-4 space-y-4">

        {/* Row 1: return + inflation */}
        <div className="grid grid-cols-2 gap-3">
          <InputField label={t('investments.forecastReturn')}     value={returnStr}    onChange={setReturnStr}    suffix="%" />
          <InputField label={t('investments.forecastInflation')}  value={inflationStr} onChange={setInflationStr} suffix="%" />
        </div>

        {/* Row 2: initial + monthly */}
        <div className="grid grid-cols-2 gap-3">
          <InputField label={t('investments.simulatorInitial')}        value={initialStr}  onChange={setInitialStr}  suffix="€" />
          <InputField label={t('investments.forecastContribution')}    value={monthlyStr}  onChange={setMonthlyStr}  suffix="€" />
        </div>

        {/* Row 3: ticker + horizon */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">{t('investments.simulatorTicker')}</span>
            <TickerSuggestInput
              value={ticker}
              onChange={setTicker}
              placeholder={t('investments.simulatorTickerPlaceholder')}
            />
          </div>

          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">{t('investments.simulatorHorizon')}</span>
            <div className="relative">
              <Input
                type="text"
                inputMode="numeric"
                value={horizonStr}
                onChange={e => setHorizonStr(e.target.value)}
                className="pr-10"
              />
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                yrs
              </span>
            </div>
            <div className="flex gap-1 pt-0.5">
              {HORIZON_PRESETS.map(h => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setHorizonStr(String(h))}
                  className={`flex-1 rounded px-1 py-0.5 text-xs font-medium transition-colors ${
                    horizonStr === String(h)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/70'
                  }`}
                >
                  {h}y
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Summary stats */}
        {finalPoint && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-lg bg-muted/30 px-3 py-2.5 text-center">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('investments.forecastNominal')}</p>
              <p className="text-base font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                {formatDecimal(finalPoint.nominal)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('investments.forecastReal')}</p>
              <p className="text-base font-semibold tabular-nums text-violet-600 dark:text-violet-400">
                {formatDecimal(finalPoint.real)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('investments.forecastInvested')}</p>
              <p className="text-base font-semibold tabular-nums">
                {formatDecimal(finalPoint.invested)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('investments.simulatorGain')}</p>
              <p className="text-base font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                {formatDecimal(finalPoint.nominal - finalPoint.invested)}
              </p>
            </div>
          </div>
        )}

        {/* Chart */}
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="sim-nominal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#10b981" stopOpacity={0.18} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="sim-real" x1="0" y1="0" x2="0" y2="1">
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
              tickFormatter={v => `${v}y`}
            />
            <YAxis
              width={48}
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
              fill="url(#sim-nominal)"
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="real"
              name={t('investments.forecastReal')}
              stroke="#8b5cf6"
              strokeWidth={2}
              fill="url(#sim-real)"
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
            <Legend
              iconType="plainline"
              wrapperStyle={{ fontSize: 10, paddingTop: 4 }}
              formatter={v => String(v ?? '')}
            />
          </ComposedChart>
        </ResponsiveContainer>

      </div>
    </section>
  )
}
