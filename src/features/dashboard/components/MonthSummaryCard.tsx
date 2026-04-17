import { DollarSign, TrendingUp, TrendingDown, Landmark, Coins } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { formatMoney } from '@/domain/money'
import { useT } from '@/shared/i18n'
import type { useMonthSummary } from '@/shared/hooks/useTransactions'

type Summary = ReturnType<typeof useMonthSummary>

interface Props {
  summary:     Summary
  savingsRate: number | null
}

export default function MonthSummaryCard({ summary, savingsRate }: Props) {
  const t = useT()
  const coreExpenses = summary.personalExpenses - summary.personalInvesting - summary.personalRoundup

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{t('dashboard.monthSummary')}</CardTitle>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${summary.personalBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
          {summary.personalBalance >= 0 ? '+' : ''}{formatMoney(summary.personalBalance)}
        </div>
        {savingsRate != null && (
          <p className="mt-0.5 text-sm text-muted-foreground">
            {savingsRate >= 0
              ? t('dashboard.savedPct', { rate: String(savingsRate) })
              : t('dashboard.overspentPct', { rate: String(Math.abs(savingsRate)) })}
          </p>
        )}
        {summary.sharedPending > 0 && (
          <p className="mt-0.5 text-sm text-amber-600 dark:text-amber-400">
            {t('sharedExpenses.pending', { amount: formatMoney(summary.sharedPending) })}
          </p>
        )}
        <div className="mt-4 space-y-2.5">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-muted-foreground">{t('dashboard.income')}</span>
            </div>
            <div className="text-right">
              <span className="font-medium text-emerald-600">+{formatMoney(summary.personalIncome)}</span>
              {summary.personalIncome !== summary.income && (
                <p className="text-sm text-muted-foreground">{t('dashboard.total')} {formatMoney(summary.income)}</p>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1.5">
              <TrendingDown className="h-3.5 w-3.5 text-rose-500" />
              <span className="text-muted-foreground">{t('dashboard.expenses')}</span>
            </div>
            <div className="text-right">
              <span className="font-medium text-rose-600">-{formatMoney(Math.abs(coreExpenses))}</span>
              {coreExpenses !== summary.coreExpenses && (
                <p className="text-sm text-muted-foreground">{t('dashboard.total')} {formatMoney(Math.abs(summary.coreExpenses))}</p>
              )}
            </div>
          </div>
          {summary.personalInvesting < 0 && (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1.5">
                <Landmark className="h-3.5 w-3.5 text-violet-500" />
                <span className="text-muted-foreground">{t('dashboard.investing')}</span>
              </div>
              <span className="font-medium text-violet-600">{formatMoney(summary.personalInvesting)}</span>
            </div>
          )}
          {summary.personalRoundup < 0 && (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1.5">
                <Coins className="h-3.5 w-3.5 text-stone-400" />
                <span className="text-muted-foreground">{t('dashboard.roundup')}</span>
              </div>
              <span className="font-medium text-stone-500">{formatMoney(summary.personalRoundup)}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
