import {
  ComposedChart, Bar, Line,
  XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import BankLogo from '@/shared/components/BankLogo'
import { BANK_OPTIONS } from '@/shared/config/banks'
import { useInvestmentAccountHistory } from '@/shared/hooks/useTransactions'
import { formatMoney } from '@/domain/money'
import { useT } from '@/shared/i18n'
import type { Account } from '@/domain/types'

const axisFmt = (v: number) => formatMoney(v).replace(/[^0-9,.-]/g, '')

export default function InvestmentAccountCard({ account }: { account: Account }) {
  const t    = useT()
  const bank = account.bankCode ? BANK_OPTIONS.find(b => b.code === account.bankCode) : undefined
  const { data = [] } = useInvestmentAccountHistory(account)

  const totalInvested = data.reduce((s, d) => s + d.invested, 0)
  const marketGain    = account.balance - totalInvested   // rough unrealised gain from this window

  return (
    <Card>
      <CardHeader className="pb-3">
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
            <div className="min-w-0">
              <CardTitle className="text-sm font-medium truncate">{account.name}</CardTitle>
              <p className="text-xs text-muted-foreground">{t('dashboard.investmentHistory')}</p>
            </div>
          </div>

          {/* Right: balance + gain */}
          <div className="text-right shrink-0">
            <p className="text-lg font-bold tabular-nums">{formatMoney(account.balance)}</p>
            {marketGain !== 0 && (
              <p className={`text-xs tabular-nums ${marketGain >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {marketGain >= 0 ? '+' : ''}{formatMoney(marketGain)}
              </p>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={190}>
          <ComposedChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
            />
            {/* Left axis: invested per month */}
            <YAxis
              yAxisId="invested"
              width={52}
              tick={{ fontSize: 10 }}
              tickFormatter={axisFmt}
              tickLine={false}
              axisLine={false}
            />
            {/* Right axis: cumulative balance */}
            <YAxis
              yAxisId="balance"
              orientation="right"
              width={52}
              tick={{ fontSize: 10 }}
              tickFormatter={axisFmt}
              tickLine={false}
              axisLine={false}
            />
            <ReTooltip
              formatter={(value, name) => [
                typeof value === 'number' ? formatMoney(value) : String(value ?? ''),
                String(name ?? ''),
              ]}
              contentStyle={{ fontSize: 12 }}
            />
            <Bar
              yAxisId="invested"
              dataKey="invested"
              name={t('dashboard.invested')}
              fill={account.color}
              opacity={0.7}
              radius={[3, 3, 0, 0]}
              maxBarSize={22}
            />
            <Line
              yAxisId="balance"
              type="monotone"
              dataKey="balance"
              name={t('dashboard.portfolioValue')}
              stroke="var(--foreground)"
              strokeWidth={2}
              dot={false}
              strokeOpacity={0.85}
            />
          </ComposedChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="flex items-center justify-center gap-5 mt-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: account.color, opacity: 0.8 }} />
            {t('dashboard.invested')}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="block h-0.5 w-4 shrink-0 bg-foreground opacity-70 rounded" />
            {t('dashboard.portfolioValue')}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
