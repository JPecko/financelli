import { cn } from '@/lib/utils'
import { Pencil, Trash2, RefreshCw, Play, Pause, ArrowRight, CalendarDays, Zap, Loader2 } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { formatMoney } from '@/domain/money'
import { getCategoryById, tCategory } from '@/domain/categories'
import { formatDate } from '@/shared/utils/format'
import { useT } from '@/shared/i18n'
import type { RecurringRule } from '@/domain/types'

const FREQ_BADGE: Record<string, string> = {
  weekly:  'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  monthly: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  yearly:  'bg-amber-500/10 text-amber-600 dark:text-amber-400',
}

interface Props {
  rule:         RecurringRule
  accountName:  (id: number) => string
  applying:     boolean
  onApply:      () => void
  onEdit:       () => void
  onToggle:     () => void
  onDelete:     () => void
}

export default function RecurringRuleRow({ rule, accountName, applying, onApply, onEdit, onToggle, onDelete }: Props) {
  const t = useT()
  const cat        = getCategoryById(rule.category)
  const isTransfer = rule.type === 'transfer' && rule.toAccountId != null
  const amountColor = isTransfer
    ? 'text-blue-600 dark:text-blue-400'
    : rule.amount >= 0 ? 'text-emerald-600' : 'text-rose-600'

  return (
    <div
      className={cn(
        'relative px-4 py-3 flex items-center gap-3 group transition-colors',
        !rule.active && 'opacity-60',
      )}
      style={{ backgroundColor: `${cat.color}12` }}
    >
      <div className="absolute inset-0 bg-foreground/[0.04] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: `${cat.color}20` }}
      >
        <RefreshCw className="h-4 w-4" style={{ color: cat.color }} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-semibold truncate">{rule.name}</p>
          {!rule.active && (
            <Badge variant="secondary" className="text-xs shrink-0">{t('recurring.paused')}</Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className="sm:hidden flex items-center gap-1 text-xs font-medium text-foreground/75 shrink-0">
            <CalendarDays className="h-3 w-3" />
            {formatDate(rule.nextDue)}
          </span>
          <span className="sm:hidden text-xs text-muted-foreground shrink-0">·</span>
          {isTransfer ? (
            <span className="flex items-center gap-0.5 text-xs text-muted-foreground min-w-0">
              <span className="truncate">{accountName(rule.accountId)}</span>
              <ArrowRight className="h-3 w-3 shrink-0" />
              <span className="truncate">{accountName(rule.toAccountId!)}</span>
            </span>
          ) : (
            <span className="text-xs text-muted-foreground truncate">
              {accountName(rule.accountId)}
            </span>
          )}
          <span className="text-xs text-muted-foreground shrink-0">·</span>
          <Badge
            variant="secondary"
            className="text-xs px-1.5 py-0 h-5 shrink-0"
            style={{ borderLeft: `2px solid ${cat.color}` }}
          >
            {tCategory(cat.id, t)}
          </Badge>
          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0 ${FREQ_BADGE[rule.frequency]}`}>
            {t(('recurring.frequencies.' + rule.frequency) as Parameters<typeof t>[0])}
          </span>
        </div>
      </div>

      <div className="hidden sm:flex flex-col items-end shrink-0">
        <span className="text-xs text-muted-foreground">{t('recurring.nextDue')}</span>
        <span className="text-sm font-medium tabular-nums">{formatDate(rule.nextDue)}</span>
      </div>

      <span className={`text-sm font-semibold shrink-0 whitespace-nowrap tabular-nums ${amountColor}`}>
        {isTransfer
          ? formatMoney(Math.abs(rule.amount))
          : `${rule.amount >= 0 ? '+' : ''}${formatMoney(rule.amount)}`
        }
      </span>

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
          <DropdownMenuItem onClick={onApply} disabled={applying}>
            {applying
              ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              : <Zap className="h-4 w-4 mr-2" />
            }
            {t('recurring.applyNow')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onEdit}>
            <Pencil className="h-4 w-4 mr-2" /> {t('common.edit')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onToggle}>
            {rule.active
              ? <><Pause className="h-4 w-4 mr-2" /> {t('recurring.pause')}</>
              : <><Play  className="h-4 w-4 mr-2" /> {t('recurring.resume')}</>
            }
          </DropdownMenuItem>
          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onDelete}>
            <Trash2 className="h-4 w-4 mr-2" /> {t('common.delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
