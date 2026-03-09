import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Plus, Pencil, Trash2, RefreshCw, Play, Pause, ArrowRight, CalendarDays, Zap, Loader2 } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { useRecurringRules, removeRule, updateRule, applyRule } from '@/shared/hooks/useRecurringRules'
import { useAccounts } from '@/shared/hooks/useAccounts'
import { formatMoney } from '@/domain/money'
import { getCategoryById } from '@/domain/categories'
import { formatDate } from '@/shared/utils/format'
import EmptyState from '@/shared/components/EmptyState'
import PageLoader from '@/shared/components/PageLoader'
import RecurringFormModal from '../components/RecurringFormModal'
import type { RecurringRule } from '@/domain/types'
import { useT } from '@/shared/i18n'

const FREQ_BADGE: Record<string, string> = {
  weekly:  'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  monthly: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  yearly:  'bg-amber-500/10 text-amber-600 dark:text-amber-400',
}

export default function RecurringPage() {
  const t = useT()
  const { data: rules    = [], isLoading } = useRecurringRules()
  const { data: accounts = [] } = useAccounts()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing]     = useState<RecurringRule | undefined>()
  const [applying, setApplying]   = useState<number | null>(null)

  const accountName = (id: number) => accounts.find(a => a.id === id)?.name ?? '?'

  const handleEdit = (rule: RecurringRule) => {
    setEditing(rule)
    setModalOpen(true)
  }

  const handleClose = () => {
    setModalOpen(false)
    setEditing(undefined)
  }

  const handleDelete = async (id: number | undefined) => {
    if (id == null) return
    if (confirm(t('recurring.deleteConfirm'))) {
      await removeRule(id)
    }
  }

  const handleApply = async (rule: RecurringRule) => {
    if (rule.id == null) return
    setApplying(rule.id)
    try { await applyRule(rule) } finally { setApplying(null) }
  }

  const handleToggle = async (rule: RecurringRule) => {
    if (rule.id == null) return
    await updateRule(rule.id, { active: !rule.active })
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t('recurring.title')}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t('recurring.subtitle')}
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t('recurring.addRule')}
        </Button>
      </div>

      {isLoading ? (
        <PageLoader message={t('recurring.loading')} />
      ) : rules.length === 0 ? (
        <EmptyState
          icon={RefreshCw}
          title={t('recurring.noRules')}
          description={t('recurring.noRulesDesc')}
          action={
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('recurring.addFirst')}
            </Button>
          }
        />
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <div className="divide-y divide-border">
            {rules.map(rule => {
              const cat        = getCategoryById(rule.category)
              const isTransfer = rule.type === 'transfer' && rule.toAccountId != null
              const amountColor = isTransfer
                ? 'text-blue-600 dark:text-blue-400'
                : rule.amount >= 0 ? 'text-emerald-600' : 'text-rose-600'

              return (
                <div
                  key={rule.id}
                  className={cn(
                    'relative px-4 py-3 flex items-center gap-3 group transition-colors',
                    !rule.active && 'opacity-60',
                  )}
                  style={{ backgroundColor: `${cat.color}12` }}
                >
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-foreground/[0.04] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                  {/* Category icon */}
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${cat.color}20` }}
                  >
                    <RefreshCw className="h-4 w-4" style={{ color: cat.color }} />
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold truncate">{rule.name}</p>
                      {!rule.active && (
                        <Badge variant="secondary" className="text-xs shrink-0">{t('recurring.paused')}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {/* Date — visible on mobile only (desktop has its own column) */}
                      <span className="sm:hidden flex items-center gap-1 text-xs font-medium text-foreground/75 shrink-0">
                        <CalendarDays className="h-3 w-3" />
                        {formatDate(rule.nextDue)}
                      </span>
                      <span className="sm:hidden text-xs text-muted-foreground shrink-0">·</span>
                      {/* Secondary meta */}
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
                        {cat.label}
                      </Badge>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0 ${FREQ_BADGE[rule.frequency]}`}>
                        {t(('recurring.frequencies.' + rule.frequency) as Parameters<typeof t>[0])}
                      </span>
                    </div>
                  </div>

                  {/* Date column — desktop only */}
                  <div className="hidden sm:flex flex-col items-end shrink-0">
                    <span className="text-xs text-muted-foreground">{t('recurring.nextDue')}</span>
                    <span className="text-sm font-medium tabular-nums">{formatDate(rule.nextDue)}</span>
                  </div>

                  {/* Amount */}
                  <span className={`text-sm font-semibold shrink-0 whitespace-nowrap tabular-nums ${amountColor}`}>
                    {isTransfer
                      ? formatMoney(Math.abs(rule.amount))
                      : `${rule.amount >= 0 ? '+' : ''}${formatMoney(rule.amount)}`
                    }
                  </span>

                  {/* Actions */}
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
                      <DropdownMenuItem
                        onClick={() => handleApply(rule)}
                        disabled={applying === rule.id}
                      >
                        {applying === rule.id
                          ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          : <Zap className="h-4 w-4 mr-2" />
                        }
                        {t('recurring.applyNow')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEdit(rule)}>
                        <Pencil className="h-4 w-4 mr-2" /> {t('common.edit')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggle(rule)}>
                        {rule.active
                          ? <><Pause className="h-4 w-4 mr-2" /> {t('recurring.pause')}</>
                          : <><Play  className="h-4 w-4 mr-2" /> {t('recurring.resume')}</>
                        }
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => handleDelete(rule.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" /> {t('common.delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <RecurringFormModal open={modalOpen} onClose={handleClose} rule={editing} />
    </div>
  )
}
