import { useNavigate } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as ReTooltip, ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import BankLogo from '@/shared/components/BankLogo'
import { BANK_OPTIONS } from '@/shared/config/banks'
import { useInvestmentAccountHistory, useInvestmentCapitalAdjustments } from '@/shared/hooks/useTransactions'
import { formatMoney, fromCents } from '@/domain/money'
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

  // History from transactions (deposits + balance snapshots)
  const { data: historyData = [] } = useInvestmentAccountHistory(account)

  const investedBaseEuros = effectiveInvestedBase > 0
    ? Math.round(fromCents(effectiveInvestedBase) * 100) / 100
    : null

  // Build chart data:
  // - patrimonio: balance from transaction history; last point = current computed balance
  // - investido:  cumulative deposits, starting from what was invested before the window
  const investedInWindow = historyData.reduce(
    (s, d) => s + Math.round(fromCents(d.invested) * 100) / 100, 0,
  )
  const priorInvested = investedBaseEuros != null
    ? Math.max(0, investedBaseEuros - investedInWindow)
    : 0

  let cumulativeInvested = priorInvested
  const chartData = historyData.map((d, i) => {
    cumulativeInvested += Math.round(fromCents(d.invested) * 100) / 100
    const isLast = i === historyData.length - 1
    return {
      month:      d.month,
      patrimonio: isLast
        ? Math.round(fromCents(computedBalance) * 100) / 100
        : Math.round(fromCents(d.balance) * 100) / 100,
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
            <CardTitle className="truncate text-sm font-medium">{account.name}</CardTitle>
            <span className="shrink-0 text-muted-foreground transition-colors">
              <ArrowUpRight className="h-3.5 w-3.5" />
            </span>
          </button>

          <div className="text-right shrink-0">
            <p className="text-lg font-bold tabular-nums">{formatMoney(computedBalance)}</p>
            <p className="text-[10px] text-muted-foreground">{t('dashboard.portfolioValue')}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">

        {/* Stats grid */}
        {hasHoldings ? (
          <div className={`grid gap-2 rounded-lg bg-muted/30 px-3 py-2.5 ${account.investedBase != null ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {effectiveInvestedBase > 0 && (
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide leading-tight">
                  {t('investments.investedBase')}
                </p>
                <p className="text-sm font-semibold tabular-nums">{formatMoney(effectiveInvestedBase)}</p>
                <p className="text-[10px] text-muted-foreground">depositado</p>
              </div>
            )}
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide leading-tight">
                {t('investments.costBasis')}
              </p>
              <p className="text-sm font-semibold tabular-nums">{formatMoney(adjCostBasis)}</p>
              {totalFees > 0 && (
                <p className="text-[10px] text-muted-foreground">incl. {formatMoney(totalFees)} fees</p>
              )}
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide leading-tight">
                {t('investments.marketValue')}
              </p>
              <p className="text-sm font-semibold tabular-nums">{formatMoney(marketValueCents)}</p>
              <p className={`text-[10px] font-medium ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                {isPositive ? '+' : ''}{formatMoney(pnl)} ({isPositive ? '+' : ''}{pnlPct.toFixed(1)}%)
              </p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground px-1">
            {t('investments.noHoldings')} — {t('investments.addHolding').toLowerCase()} na página de investimentos.
          </p>
        )}

        {/* Assets held in this account: name, ticker, current price */}
        {hasHoldings && (() => {
          const heldAssetIds = [...new Set(holdings.map(h => h.assetId))]
          return (
            <div className="space-y-1">
              {heldAssetIds.map(id => {
                const asset = assetMap[id]
                if (!asset) return null
                return (
                  <div key={id} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground truncate">
                      {asset.name}{asset.ticker ? ` (${asset.ticker.toUpperCase()})` : ''}
                    </span>
                    <span className="font-medium tabular-nums shrink-0 ml-3">{formatMoney(asset.currentPrice)}</span>
                  </div>
                )
              })}
            </div>
          )
        })()}

        {/* History chart: patrimonio vs capital investido */}
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
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
            {/* Capital Investido total — dashed reference */}
            {investedBaseEuros != null && investedBaseEuros > 0 && (
              <ReferenceLine
                y={investedBaseEuros}
                stroke={account.color}
                strokeDasharray="5 4"
                strokeWidth={1.5}
                label={{ value: t('investments.investedBase'), position: 'insideTopRight', fontSize: 9, fill: 'var(--muted-foreground)' }}
              />
            )}
            {/* Patrimonio: portfolio value over time */}
            <Line
              type="monotone"
              dataKey="patrimonio"
              name={t('dashboard.portfolioValue')}
              stroke={account.color}
              strokeWidth={2.5}
              dot={false}
              connectNulls
            />
            {/* Capital Investido: cumulative deposits */}
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
          </LineChart>
        </ResponsiveContainer>

      </CardContent>
    </Card>
  )
}
