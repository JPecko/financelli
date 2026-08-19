import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react'
import BankLogo from '@/shared/components/BankLogo'
import { formatMoney } from '@/domain/money'
import { BANK_OPTIONS } from '@/shared/config/banks'
import { useT } from '@/shared/i18n'
import type { AccountTotal } from '../utils/recurringTotals'

interface Props {
  totals: AccountTotal[]
}

export default function RecurringAccountTotals({ totals }: Props) {
  const t = useT()
  if (totals.length === 0) return null

  return (
    <div className="mb-6 rounded-lg border overflow-hidden">
      <p className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b bg-muted/40">
        {t('recurring.byAccount')}
      </p>
      <div className="divide-y divide-border">
        {totals.map(({ account, incoming, outgoing }) => {
          const bank = account.bankCode ? BANK_OPTIONS.find(b => b.code === account.bankCode) : undefined
          return (
            <div key={account.id} className="px-4 py-3 flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                {bank ? (
                  <BankLogo
                    domain={bank.logoDomain}
                    name={bank.name}
                    accountType={account.type}
                    imgClassName="h-5 w-5 object-contain"
                    iconClassName="h-4 w-4 text-muted-foreground"
                  />
                ) : (
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: account.color }} />
                )}
              </div>
              <p className="flex-1 min-w-0 text-sm font-medium truncate">{account.name}</p>
              <div className="flex items-center gap-1 text-xs font-semibold tabular-nums text-emerald-600 shrink-0">
                <ArrowDownCircle className="h-3.5 w-3.5" />
                {formatMoney(incoming)}
              </div>
              <div className="flex items-center gap-1 text-xs font-semibold tabular-nums text-rose-600 shrink-0">
                <ArrowUpCircle className="h-3.5 w-3.5" />
                {formatMoney(outgoing)}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
