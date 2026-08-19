import { useState } from 'react'
import { ArrowDownCircle, ArrowUpCircle, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import BankLogo from '@/shared/components/BankLogo'
import { formatMoney } from '@/domain/money'
import { BANK_OPTIONS } from '@/shared/config/banks'
import { getCategoryById, tCategory } from '@/domain/categories'
import { useT } from '@/shared/i18n'
import type { AccountTotal, CategorySlice } from '../utils/recurringTotals'

interface Props {
  totals: AccountTotal[]
}

export default function RecurringAccountTotals({ totals }: Props) {
  const t = useT()
  const [open, setOpen] = useState(true)
  if (totals.length === 0) return null

  return (
    <div className="mb-6 rounded-lg border overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-muted/40 hover:bg-muted/60 transition-colors"
      >
        {t('recurring.byAccount')}
        <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="divide-y divide-border border-t">
          {totals.map(({ account, incoming, outgoing, categories }) => {
            const bank = account.bankCode ? BANK_OPTIONS.find(b => b.code === account.bankCode) : undefined
            return (
              <div key={account.id} className="px-4 py-3">
                <div className="flex items-center gap-3">
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
                {categories.length > 0 && <CategoryBreakdown categories={categories} />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Category distribution for one account — vertical list, largest first, with a proportion bar.
function CategoryBreakdown({ categories }: { categories: CategorySlice[] }) {
  const t = useT()
  return (
    <div className="mt-2 pl-11 space-y-1.5">
      {categories.map(({ categoryId, amount, percent }) => {
        const cat = getCategoryById(categoryId)
        const CatIcon = cat.icon
        return (
          <div key={categoryId} className="flex items-center gap-2">
            <CatIcon className="h-3.5 w-3.5 shrink-0" style={{ color: cat.color }} />
            <span className="text-xs text-muted-foreground w-24 shrink-0 truncate">{tCategory(cat.id, t)}</span>
            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${percent}%`, backgroundColor: cat.color }}
              />
            </div>
            <span className="text-xs tabular-nums text-muted-foreground w-9 text-right shrink-0">
              {Math.round(percent)}%
            </span>
            <span className="text-xs font-semibold tabular-nums w-16 text-right shrink-0">
              {formatMoney(amount)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
