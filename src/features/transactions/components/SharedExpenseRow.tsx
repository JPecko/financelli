import { Pencil, Trash2, RotateCcw } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { formatMoney } from '@/domain/money'
import { formatDate } from '@/shared/utils/format'
import { getCategoryById, tCategory } from '@/domain/categories'
import { useT } from '@/shared/i18n'
import type { SharedExpense } from '@/domain/types'
import { TRANSACTIONS_GRID_COLS } from './TransactionRow'

const ROW_BASE_CLASS =
  `relative px-4 py-3 transition-colors group flex items-center gap-3 md:grid ${TRANSACTIONS_GRID_COLS} md:gap-x-3 md:items-center`

interface SharedExpenseRowProps {
  se:       SharedExpense
  onEdit:   (se: SharedExpense) => void
  onDelete: (id: number) => Promise<void>
  onReopen: (id: number) => Promise<void>
}

export default function SharedExpenseRow({ se, onEdit, onDelete, onReopen }: SharedExpenseRowProps) {
  const t   = useT()
  const cat = getCategoryById(se.category)

  const bgStyle = se.status === 'open'
    ? { backgroundColor: 'rgb(245 158 11 / 0.05)' }
    : {}

  return (
    <div className={ROW_BASE_CLASS} style={bgStyle}>
      <div className="absolute inset-0 bg-foreground/[0.04] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

      {/* Date */}
      <span className="hidden md:block text-sm text-muted-foreground">{formatDate(se.date)}</span>

      {/* Description + status badge */}
      <div className="hidden md:flex items-center gap-1.5 min-w-0">
        <p className="text-sm font-semibold truncate leading-snug">{se.description || '—'}</p>
        {se.payer === 'other' && (
          <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5 shrink-0 border-amber-500/50 text-amber-600 dark:text-amber-400">↩</Badge>
        )}
        {se.status === 'open' && (
          <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5 shrink-0 border-amber-500/50 text-amber-600 dark:text-amber-400 uppercase">
            {t('sharedExpenses.statusOpen')}
          </Badge>
        )}
        {se.status === 'settled' && (
          <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5 shrink-0 text-muted-foreground uppercase">
            {t('sharedExpenses.statusSettled')}
          </Badge>
        )}
      </div>

      {/* Payer / account column */}
      <div className="hidden md:block min-w-0">
        <span className="text-sm text-muted-foreground truncate">
          {se.payerLabel || '—'}
        </span>
      </div>

      {/* Category */}
      <div className="hidden md:flex items-center">
        <Badge
          variant="secondary"
          className="text-xs px-1.5 py-0 h-5 max-w-full truncate"
          style={{ borderLeft: `2px solid ${cat.color}` }}
        >
          {tCategory(cat.id, t)}
        </Badge>
      </div>

      {/* Mobile layout */}
      <div className="md:hidden flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <p className="text-sm font-semibold truncate leading-snug">{se.description || '—'}</p>
          {se.payer === 'other' && (
            <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5 shrink-0 border-amber-500/50 text-amber-600 dark:text-amber-400">↩</Badge>
          )}
        </div>
        <div className="mt-1 flex items-center gap-1.5">
          <Badge
            variant="secondary"
            className="text-xs px-1.5 py-0 h-5 shrink-0"
            style={{ borderLeft: `2px solid ${cat.color}` }}
          >
            {tCategory(cat.id, t)}
          </Badge>
          {se.status === 'open' && (
            <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5 shrink-0 border-amber-500/50 text-amber-600 dark:text-amber-400 uppercase">
              {t('sharedExpenses.statusOpen')}
            </Badge>
          )}
          {se.status === 'settled' && (
            <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5 shrink-0 text-muted-foreground uppercase">
              {t('sharedExpenses.statusSettled')}
            </Badge>
          )}
        </div>
        <div className="text-sm text-muted-foreground mt-1">{formatDate(se.date)}</div>
        {se.payerLabel && (
          <div className="text-sm text-muted-foreground mt-0.5 truncate">{se.payerLabel}</div>
        )}
      </div>

      {/* Amount */}
      <div className="shrink-0 md:text-right">
        <span className="block text-sm font-semibold tabular-nums text-rose-600">
          -{formatMoney(se.myShare)}
        </span>
      </div>

      {/* Actions dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
            <span className="sr-only">Actions</span>
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="5"  r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="12" cy="19" r="1.5" />
            </svg>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(se)}>
            <Pencil className="h-4 w-4 mr-2" /> {t('common.edit')}
          </DropdownMenuItem>
          {se.status === 'settled' && (
            <DropdownMenuItem onClick={() => se.id != null && onReopen(se.id)}>
              <RotateCcw className="h-4 w-4 mr-2" /> {t('sharedExpenses.markOpen')}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            disabled={se.id == null}
            onClick={() => se.id != null && onDelete(se.id)}
          >
            <Trash2 className="h-4 w-4 mr-2" /> {t('common.delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
