import { getCategoryById, tCategory } from '@/domain/categories'
import { formatMoney } from '@/domain/money'
import { useT } from '@/shared/i18n'
import BalanceValue from '@/shared/components/BalanceValue'
import BudgetProgressBar from './BudgetProgressBar'
import { STATUS_TEXT } from '../utils/budgetStatusStyles'
import type { BudgetRowData } from '@/domain/budgets'

interface Props {
  row:         BudgetRowData
  markerPct?:  number | null
  showProjection: boolean
  onClick:     () => void
}

export default function BudgetRow({ row, markerPct, showProjection, onClick }: Props) {
  const t    = useT()
  const cat  = getCategoryById(row.budget.category)
  const Icon = cat.icon
  const remaining = row.budget.amountCents - row.spent

  return (
    <button type="button" onClick={onClick} className="w-full space-y-2 px-4 py-3 text-left transition-colors hover:bg-accent/50">
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${cat.color}22` }}>
          <Icon className="h-4 w-4" style={{ color: cat.color }} />
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{tCategory(cat.id, t)}</span>
        <BalanceValue>
          <span className="text-sm tabular-nums">
            <span className="font-semibold">{formatMoney(row.spent)}</span>
            <span className="text-muted-foreground"> / {formatMoney(row.budget.amountCents)}</span>
          </span>
        </BalanceValue>
      </div>
      <BudgetProgressBar pct={row.pct} status={row.status} markerPct={markerPct} />
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <BalanceValue>
          <span className={row.status === 'over' ? STATUS_TEXT.over : undefined}>
            {remaining >= 0
              ? t('budgets.remaining', { amount: formatMoney(remaining) })
              : t('budgets.overBy', { amount: formatMoney(-remaining) })}
            {showProjection && row.projected > row.spent && ` · ${t('budgets.projected', { amount: formatMoney(row.projected) })}`}
          </span>
        </BalanceValue>
        <span className={`font-medium tabular-nums ${STATUS_TEXT[row.status]}`}>{row.pct}%</span>
      </div>
    </button>
  )
}
