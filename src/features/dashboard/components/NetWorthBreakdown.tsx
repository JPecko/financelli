import { formatMoney } from '@/domain/money'
import { useT } from '@/shared/i18n'
import BalanceValue from '@/shared/components/BalanceValue'
import { ACCOUNT_TYPE_META } from '../utils/dashboardHelpers'
import type { AccountType } from '@/domain/types'

interface Props {
  byType:        [AccountType, number][]
  positiveTotal: number
}

export default function NetWorthBreakdown({ byType, positiveTotal }: Props) {
  const t = useT()

  return (
    <div className="space-y-2">
      {byType.map(([type, balance]) => {
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
                <BalanceValue>
                  <span className={`font-medium ${balance < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-foreground'}`}>
                    {formatMoney(balance)}
                  </span>
                </BalanceValue>
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
  )
}
