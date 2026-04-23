import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as ReTooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { parseISO, differenceInMonths, startOfMonth } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import BankLogo from '@/shared/components/BankLogo'
import { BANK_OPTIONS } from '@/shared/config/banks'
import { useInvestmentAccountHistory, useInvestmentCapitalAdjustments } from '@/shared/hooks/useTransactions'
import { formatMoney, toCents } from '@/domain/money'
import { useT } from '@/shared/i18n'
import {
  computeAdjustedCostBasis,
  computeEffectiveInvestedBase,
  computeInvestmentBalance,
  computeMarketValue,
} from '@/features/investments/utils/investmentMetrics'
import type { Account, Asset, Holding } from '@/domain/types'

const axisFmt = (v: number) => {
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(0)}k`
  return String(v)
}

// cents → rounded euros (chart data lives in euros, not cents)
const toEur = (cents: number) => Math.round(cents) / 100

interface Props {
  account:  Account
  holdings: Holding[]
  assets:   Asset[]
}

export default function InvestmentAccountCard({ account, holdings, assets }: Props) {
  const t        = useT()
  const navigate = useNavigate()
  const bank     = account.bankCode ? BANK_OPTIONS.find(b => b.code === account.bankCode) : undefined
  const assetMap = Object.fromEntries(assets.map(a => [a.id!, a]))
  const { data: capitalAdjustments = {} } = useInvestmentCapitalAdjustments(account.id != null ? [account.id] : [])
  const capitalTransactions = account.id != null && capitalAdjustments[account.id] != null
    ? [{ accountId: account.id, amount: capitalAdjustments[account.id], category: 'capital' } as unknown as import('@/domain/types').Transaction]
    : []

  const hasHoldings      = holdings.length > 0
  const marketValueCents = computeMarketValue(holdings, assetMap)
  const totalFees        = (account.entryFee ?? 0) * holdings.length
  const adjCostBasis     = computeAdjustedCostBasis(account, holdings)
  const pnl              = marketValueCents - adjCostBasis
  const pnlPct           = adjCostBasis > 0 ? (pnl / adjCostBasis) * 100 : 0
  const isPositive       = pnl >= 0
  const effectiveInvestedBase = computeEffectiveInvestedBase(account, capitalTransactions)
  const computedBalance  = computeInvestmentBalance(account, holdings, assetMap, capitalTransactions)

  // Dynamic window: show since account creation (capped at 24 months)
  const historyMonths = useMemo(() => {
    const created = parseISO(account.createdAt)
    const diff = differenceInMonths(startOfMonth(new Date()), startOfMonth(created)) + 1
    return Math.min(Math.max(diff, 2), 24)
  }, [account.createdAt])

  const { data: historyData = [] } = useInvestmentAccountHistory(account, historyMonths)

  const heldAssetIds = useMemo(
    () => [...new Set(holdings.map(h => h.assetId))],
    [holdings],
  )

  const investedBaseEuros = effectiveInvestedBase > 0 ? toEur(effectiveInvestedBase) : null

  const investedInWindow = historyData.reduce((s, d) => s + toEur(d.invested), 0)
  const priorInvested    = investedBaseEuros != null
    ? Math.max(0, investedBaseEuros - investedInWindow)
    : 0

  let cumulativeInvested = priorInvested
  const chartData = historyData.map((d, i) => {
    cumulativeInvested += toEur(d.invested)
    const isLast = i === historyData.length - 1
    return {
      month:      d.month,
      patrimonio: isLast ? toEur(computedBalance) : toEur(d.balance),
      investido:  cumulativeInvested,
    }
  })

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <button
            type="button"
            onClick={() => navigate('/investments')}
            className="flex min-w-0 items-center gap-2.5 rounded-lg text-left transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 cursor-pointer"
            title="Gerir investimentos"
          >
            {bank && (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted shrink-0">
                <BankLogo
                  domain={bank.logoDomain}
                  name={bank.name}
                  accountType={account.type}
                  imgClassName="h-5 w-5 object-contain"
                  iconClassName="h-4 w-4 text-muted-foreground"
                />
              </div>
            )}
            <CardTitle className="truncate text-base font-medium sm:text-sm">{account.name}</CardTitle>
            <span className="shrink-0 text-muted-foreground transition-colors">
              <ArrowUpRight className="h-3.5 w-3.5" />
            </span>
          </button>

          <div className="text-right shrink-0">
            <p className="text-lg font-bold tabular-nums">{formatMoney(computedBalance)}</p>
            <p className="text-xs text-muted-foreground sm:text-[10px]">{t('dashboard.portfolioValue')}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">

        {/* Stats grid */}
        {hasHoldings ? (
          <div className="grid auto-cols-fr grid-flow-col grid-rows-[minmax(2.75rem,auto)_minmax(1.75rem,auto)_minmax(1rem,auto)] gap-x-2 gap-y-1 rounded-lg bg-muted/30 px-3 py-2.5 text-center sm:grid-rows-[minmax(2.5rem,auto)_minmax(1.5rem,auto)_minmax(0.875rem,auto)]">
            {effectiveInvestedBase > 0 && (
              <div className="contents">
                <p className="flex items-center justify-center text-xs text-muted-foreground uppercase tracking-wide leading-tight sm:text-[10px]">
                  {t('investments.investedBase')}
                </p>
                <p className="flex items-center justify-center text-base font-semibold tabular-nums sm:text-sm">{formatMoney(effectiveInvestedBase)}</p>
                <p className="flex items-start justify-center text-xs text-muted-foreground sm:text-[10px]">depositado</p>
              </div>
            )}
            <div className="contents">
              <p className="flex items-center justify-center text-xs text-muted-foreground uppercase tracking-wide leading-tight sm:text-[10px]">
                {t('investments.costBasis')}
              </p>
              <p className="flex items-center justify-center text-base font-semibold tabular-nums sm:text-sm">{formatMoney(adjCostBasis)}</p>
              {totalFees > 0 && (
                <p className="flex items-start justify-center text-xs text-muted-foreground sm:text-[10px]">incl. {formatMoney(totalFees)} fees</p>
              ) || (
                <p aria-hidden="true" className="flex items-start justify-center invisible text-xs sm:text-[10px]">.</p>
              )}
            </div>
            <div className="contents">
              <p className="flex items-center justify-center text-xs text-muted-foreground uppercase tracking-wide leading-tight sm:text-[10px]">
                {t('investments.marketValue')}
              </p>
              <p className="flex items-center justify-center text-base font-semibold tabular-nums sm:text-sm">{formatMoney(marketValueCents)}</p>
              <p className={`flex items-start justify-center text-xs font-medium sm:text-[10px] ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                {isPositive ? '+' : ''}{formatMoney(pnl)} ({isPositive ? '+' : ''}{pnlPct.toFixed(1)}%)
              </p>
            </div>
          </div>
        ) : (
          <p className="px-1 text-sm text-muted-foreground sm:text-xs">
            {t('investments.noHoldings')} — {t('investments.addHolding').toLowerCase()} na página de investimentos.
          </p>
        )}

        {/* Assets held in this account: name, ticker, current price */}
        {hasHoldings && (
          <div className="space-y-1">
            {heldAssetIds.map(id => {
              const asset = assetMap[id]
              if (!asset) return null
              return (
                <div key={id} className="flex items-center justify-between text-base sm:text-sm">
                  <span className="text-muted-foreground truncate">
                    {asset.name}{asset.ticker ? ` (${asset.ticker.toUpperCase()})` : ''}
                  </span>
                  <span className="font-medium tabular-nums shrink-0 ml-3">{formatMoney(asset.currentPrice)}</span>
                </div>
              )
            })}
          </div>
        )}

        {/* History chart: patrimonio vs capital investido */}
        <ResponsiveContainer width="100%" height={160}>
          <ComposedChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={`inv-grad-${account.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={account.color} stopOpacity={0.22} />
                <stop offset="95%" stopColor={account.color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              interval={historyMonths > 12 ? 1 : 0}
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
                typeof value === 'number' ? formatMoney(toCents(value)) : String(value ?? ''),
                String(name ?? ''),
              ]}
              contentStyle={{ fontSize: 12 }}
            />
            <Area
              type="monotone"
              dataKey="patrimonio"
              name={t('dashboard.portfolioValue')}
              stroke={account.color}
              strokeWidth={2.5}
              fill={`url(#inv-grad-${account.id})`}
              dot={false}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="investido"
              name={t('investments.investedBase')}
              stroke="var(--muted-foreground)"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              dot={false}
              connectNulls
            />
            <Legend
              iconType="plainline"
              wrapperStyle={{ fontSize: 10, paddingTop: 4 }}
              formatter={(value) => String(value ?? '')}
            />
          </ComposedChart>
        </ResponsiveContainer>

      </CardContent>
    </Card>
  )
}
