import { Link } from 'react-router-dom'
import { AlertTriangle, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { getCategoryById } from '@/domain/categories'
import { formatMoney } from '@/domain/money'
import { useT } from '@/shared/i18n'
import { cn } from '@/lib/utils'
import BalanceValue from '@/shared/components/BalanceValue'
import { UPCOMING_WINDOWS, useUpcomingPayments } from '../hooks/useUpcomingPayments'
import type { Account } from '@/domain/types'
import type { UpcomingPayment } from '@/domain/upcomingPayments'

interface Props {
  accounts:          Account[]
  effectiveBalances: Record<number, number>
  className?:        string
}

export default function UpcomingPaymentsCard({ accounts, effectiveBalances, className }: Props) {
  const t = useT()
  const u = useUpcomingPayments(accounts, effectiveBalances)
  if (u.isLoading || !u.hasRules) return null

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{t('dashboard.upcoming.title')}</CardTitle>
        <div className="flex items-center gap-1">
          {UPCOMING_WINDOWS.map(d => (
            <Button key={d} variant={u.days === d ? 'secondary' : 'ghost'} size="sm" className="h-8 px-2.5 text-xs" onClick={() => u.setDays(d)}>
              {t('dashboard.upcoming.days', { count: String(d) })}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {u.alerts.map(alert => (
          <div key={alert.accountId} className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <BalanceValue>
              <span>{t('dashboard.upcoming.alert', { account: u.accountName(alert.accountId), amount: formatMoney(alert.lowest), date: u.dateLabel(alert.date) })}</span>
            </BalanceValue>
          </div>
        ))}

        {u.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t('dashboard.upcoming.empty', { count: String(u.days) })}
            {u.nextLater && ` ${t('dashboard.upcoming.nextLater', { name: u.nextLater.name, date: u.dateLabel(u.nextLater.date) })}`}
          </p>
        ) : (
          <ul className="grid gap-x-6 lg:grid-cols-2">
            {u.items.map(item => (
              <UpcomingRow key={item.key} item={item} dateLabel={u.dateLabel(item.date)} accountName={u.accountName} />
            ))}
          </ul>
        )}

        <div className="flex items-center justify-between gap-2 border-t pt-2">
          {u.totalOut < 0 ? (
            <BalanceValue>
              <span className="text-sm text-muted-foreground">
                {t('dashboard.upcoming.totalOut')} <span className="font-semibold text-foreground">{formatMoney(-u.totalOut)}</span>
              </span>
            </BalanceValue>
          ) : <span />}
          <Button asChild variant="ghost" size="sm" className="h-8 gap-1 text-xs">
            <Link to="/recurring">{t('dashboard.upcoming.seeRecurring')} <ChevronRight className="h-3.5 w-3.5" /></Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function UpcomingRow({ item, dateLabel, accountName }: { item: UpcomingPayment; dateLabel: string; accountName: (id: number) => string }) {
  const cat  = getCategoryById(item.category)
  const Icon = cat.icon
  const isTransfer = item.toAccountId != null
  const accountLabel = isTransfer ? `${accountName(item.accountId)} → ${accountName(item.toAccountId!)}` : accountName(item.accountId)
  const tone = isTransfer ? 'text-muted-foreground' : item.amount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'

  return (
    <li className="flex items-center gap-3 border-b border-border/60 py-2 last:border-b-0 lg:[&:nth-last-child(2):nth-child(odd)]:border-b-0">
      <span className="w-16 shrink-0 text-xs font-medium capitalize text-muted-foreground">{dateLabel}</span>
      <Icon className="h-4 w-4 shrink-0" style={{ color: cat.color }} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">{item.name}</p>
        <p className="truncate text-xs text-muted-foreground">{accountLabel}</p>
      </div>
      <BalanceValue>
        <span className={cn('text-sm font-semibold tabular-nums', tone)}>
          {item.amount > 0 && !isTransfer ? '+' : ''}{formatMoney(isTransfer ? Math.abs(item.amount) : item.amount)}
        </span>
      </BalanceValue>
    </li>
  )
}
