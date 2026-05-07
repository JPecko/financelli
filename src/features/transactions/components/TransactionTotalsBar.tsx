import { TrendingUp, TrendingDown } from 'lucide-react'
import { formatMoney } from '@/domain/money'
import { useT } from '@/shared/i18n'
import { cn } from '@/lib/utils'

interface Props {
  income:   number   // cents (positive)
  expenses: number   // cents (negative)
  className?: string
}

export default function TransactionTotalsBar({ income, expenses, className }: Props) {
  const t = useT()
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="flex items-center gap-1.5">
        <TrendingUp className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
        <span className="text-xs text-muted-foreground">{t('transactions.income')}</span>
        <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
          {formatMoney(income)}
        </span>
      </div>
      <div className="h-3 w-px bg-border" />
      <div className="flex items-center gap-1.5">
        <TrendingDown className="h-3.5 w-3.5 text-rose-500 shrink-0" />
        <span className="text-xs text-muted-foreground">{t('transactions.outcome')}</span>
        <span className="text-sm font-semibold text-rose-600 dark:text-rose-400">
          {formatMoney(expenses)}
        </span>
      </div>
    </div>
  )
}
