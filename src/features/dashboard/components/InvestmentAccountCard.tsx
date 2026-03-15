import {
  AreaChart, Area, Line,
  XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import BankLogo from '@/shared/components/BankLogo'
import { BANK_OPTIONS } from '@/shared/config/banks'
import { useInvestmentAccountHistory } from '@/shared/hooks/useTransactions'
import { formatMoney, fromCents } from '@/domain/money'
import { useT } from '@/shared/i18n'
import type { Account } from '@/domain/types'

const axisFmt = (v: number) => {
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(0)}k`
  return String(v)
}

export default function InvestmentAccountCard({ account }: { account: Account }) {
  const t    = useT()
  const bank = account.bankCode ? BANK_OPTIONS.find(b => b.code === account.bankCode) : undefined
  const { data = [] } = useInvestmentAccountHistory(account)

  // Build cumulative invested (cost basis) per month
  let cum = 0
  const chartData = data.map(d => {
    cum += d.invested
    return {
      month:     d.month,
      costBasis: Math.round(fromCents(cum) * 100) / 100,
      value:     Math.round(fromCents(d.balance) * 100) / 100,
    }
  })

  // P&L: use investedBase if set, otherwise derive from chart window
  const totalInvestedFromChart = data.reduce((s, d) => s + d.invested, 0)
  const costBasisCents = account.investedBase ?? totalInvestedFromChart
  const pnl            = account.balance - costBasisCents
  const pnlPct         = costBasisCents > 0 ? (pnl / costBasisCents) * 100 : 0
  const isPositive     = pnl >= 0

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4">
          {/* Left: logo + name */}
          <div className="flex items-center gap-2.5 min-w-0">
            {bank && (
              <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <BankLogo
                  domain={bank.logoDomain}
                  name={bank.name}
                  accountType={account.type}
                  imgClassName="h-5 w-5 object-contain"
                  iconClassName="h-4 w-4 text-muted-foreground"
                />
              </div>
            )}
            <CardTitle className="text-sm font-medium truncate">{account.name}</CardTitle>
          </div>

          {/* Right: balance + P&L */}
          <div className="text-right shrink-0">
            <p className="text-lg font-bold tabular-nums">{formatMoney(account.balance)}</p>
            {costBasisCents > 0 && (
              <p className={`text-xs tabular-nums font-medium ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                {isPositive ? '+' : ''}{formatMoney(pnl)}
                <span className="ml-1 opacity-70">({isPositive ? '+' : ''}{pnlPct.toFixed(1)}%)</span>
              </p>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Stats row */}
        <div className="flex items-center gap-4 mb-3 px-1">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{t('investments.costBasis')}</p>
            <p className="text-sm font-semibold tabular-nums">{formatMoney(costBasisCents)}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{t('investments.marketValue')}</p>
            <p className="text-sm font-semibold tabular-nums">{formatMoney(account.balance)}</p>
          </div>
        </div>

        {/* Chart: cumulative cost basis (area) vs portfolio value (line) */}
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={`grad-${account.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={account.color} stopOpacity={0.25} />
                <stop offset="95%" stopColor={account.color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              width={42}
              tick={{ fontSize: 10 }}
              tickFormatter={axisFmt}
              tickLine={false}
              axisLine={false}
            />
            <ReTooltip
              formatter={(value, name) => [
                typeof value === 'number' ? formatMoney(Math.round(value * 100)) : String(value ?? ''),
                String(name ?? ''),
              ]}
              contentStyle={{ fontSize: 12 }}
            />
            {/* Area: cumulative cost basis */}
            <Area
              type="monotone"
              dataKey="costBasis"
              name={t('investments.costBasis')}
              stroke={account.color}
              strokeWidth={1.5}
              strokeDasharray="4 3"
              fill={`url(#grad-${account.id})`}
              dot={false}
            />
            {/* Line: portfolio market value */}
            <Line
              type="monotone"
              dataKey="value"
              name={t('investments.marketValue')}
              stroke={account.color}
              strokeWidth={2.5}
              dot={false}
              strokeOpacity={1}
            />
          </AreaChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="flex items-center justify-center gap-5 mt-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <svg width="16" height="8">
              <line x1="0" y1="4" x2="16" y2="4" stroke={account.color} strokeWidth="1.5" strokeDasharray="4 3" />
            </svg>
            {t('investments.costBasis')}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="block h-0.5 w-4 rounded shrink-0" style={{ backgroundColor: account.color }} />
            {t('investments.marketValue')}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
