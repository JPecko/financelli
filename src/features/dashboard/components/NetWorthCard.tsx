import { Wallet } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { formatMoney } from '@/domain/money'
import { useT } from '@/shared/i18n'
import { ACCOUNT_TYPE_META } from '../utils/dashboardHelpers'
import type { AccountType } from '@/domain/types'

interface Props {
  netWorthTotal:  number
  netWorthByType: [AccountType, number][]
  positiveTotal:  number
}

export default function NetWorthCard({ netWorthTotal, netWorthByType, positiveTotal }: Props) {
  const t = useT()

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{t('dashboard.netWorth')}</CardTitle>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold mb-3">{formatMoney(netWorthTotal)}</div>
        {netWorthByType.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('dashboard.noAccounts')}</p>
        ) : (
          <div className="space-y-2">
            {netWorthByType.map(([type, balance]) => {
              const meta = ACCOUNT_TYPE_META[type]
              const Icon = meta.icon
              const pct  = positiveTotal > 0 && balance > 0
                ? Math.round((balance / positiveTotal) * 100) : null
              return (
                <div key={type}>
                  <div className="mb-0.5 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1.5">
                      <Icon className="h-3 w-3 shrink-0" style={{ color: meta.color }} />
                      <span className="text-muted-foreground">{t(('accounts.types.' + type) as Parameters<typeof t>[0])}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`font-medium ${balance < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-foreground'}`}>
                        {formatMoney(balance)}
                      </span>
                      {pct != null && <span className="text-muted-foreground w-7 text-right">{pct}%</span>}
                    </div>
                  </div>
                  {pct != null && (
                    <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: meta.color }} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
