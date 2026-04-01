import { Pencil, Trash2, ArrowRight, RotateCcw, Users } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import AccountPill from '@/shared/components/AccountPill'
import { formatMoney } from '@/domain/money'
import { formatDate } from '@/shared/utils/format'
import { getCategoryById, tCategory } from '@/domain/categories'
import { useT } from '@/shared/i18n'
import type { Transaction, Account, SharedExpense } from '@/domain/types'

export const TRANSACTIONS_GRID_COLS = 'lg:grid-cols-[54px_1fr_220px_120px_80px_28px]'

const ROW_BASE_CLASS =
  `relative px-4 py-3 transition-colors group flex items-center gap-3 lg:grid ${TRANSACTIONS_GRID_COLS} lg:gap-x-3 lg:items-center`

interface TransactionRowProps {
  tx: Transaction
  accountsById: Record<number, Account>
  runningBalances: Record<number, number>
  onEdit: (tx: Transaction) => void
  onDelete: (id: number) => Promise<void>
  linkedSE?:    SharedExpense
  onReopenSE?:  (id: number) => Promise<void>
  linkedGroup?: { groupId: number; groupName: string }
  currentUserId?: string
}

function isInternalTransfer(tx: Transaction): boolean {
  return tx.type === 'transfer' && tx.toAccountId != null
}

function amountClassName(tx: Transaction): string {
  if (isInternalTransfer(tx)) return 'text-blue-600 dark:text-blue-400'
  return tx.amount >= 0 ? 'text-emerald-600' : 'text-rose-600'
}

function formatTxAmount(tx: Transaction): string {
  if (isInternalTransfer(tx)) return formatMoney(Math.abs(tx.amount))
  return `${tx.amount >= 0 ? '+' : ''}${formatMoney(tx.amount)}`
}

function accountLabel(tx: Transaction, accountsById: Record<number, Account>) {
  if (isInternalTransfer(tx)) {
    return (
      <span className="flex flex-col min-w-0 leading-tight">
        <AccountPill accountId={tx.accountId} accountsById={accountsById} />
        <span className="flex items-center gap-1 min-w-0">
          <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground/70" aria-hidden="true" />
          <AccountPill accountId={tx.toAccountId!} accountsById={accountsById} />
        </span>
      </span>
    )
  }
  return <AccountPill accountId={tx.accountId} accountsById={accountsById} />
}

function TransactionMetaBadges({
  tx,
  personalBadge,
  linkedGroup,
  linkedSE,
  onEdit,
  t,
}: {
  tx: Transaction
  personalBadge: { label: string; cls: string } | null
  linkedGroup?: { groupId: number; groupName: string }
  linkedSE?: SharedExpense
  onEdit: (tx: Transaction) => void
  t: ReturnType<typeof useT>
}) {
  const splitAmount = linkedSE ? formatMoney(linkedSE.totalAmount - linkedSE.myShare) : null

  if (!tx.isReimbursable && !personalBadge && !linkedGroup && !linkedSE) return null

  return (
    <div className="mt-1 flex flex-wrap items-center gap-1.5">
      {tx.isReimbursable && (
        <Badge variant="secondary" className="h-5 shrink-0 border-amber-500/50 px-1.5 py-0 text-xs text-amber-600 dark:text-amber-400">↩</Badge>
      )}
      {personalBadge && (
        <Badge variant="secondary" className={`h-5 shrink-0 px-1.5 py-0 text-xs ${personalBadge.cls}`}>{personalBadge.label}</Badge>
      )}
      {linkedGroup && (
        <Badge
          variant="secondary"
          className="h-5 shrink-0 cursor-pointer border-violet-500/50 px-1.5 py-0 text-xs text-violet-600 dark:text-violet-400"
          onClick={() => onEdit(tx)}
        >
          <Users className="mr-1 h-3 w-3" />
          { linkedGroup.groupName }
        </Badge>
      )}
      {linkedSE && splitAmount && (
        <Badge
          variant="secondary"
          className={`h-5 shrink-0 cursor-pointer px-1.5 py-0 text-xs ${linkedSE.status === 'open' ? 'border-blue-500/50 text-blue-600 dark:text-blue-400' : 'text-muted-foreground'}`}
          onClick={() => onEdit(tx)}
        >
          {linkedSE.status === 'open'
            ? t('sharedExpenses.splitPending', { amount: splitAmount })
            : t('sharedExpenses.splitSettled', { amount: splitAmount })}
        </Badge>
      )}
    </div>
  )
}

function TransactionDescription({
  tx,
  personalBadge,
  linkedGroup,
  linkedSE,
  onEdit,
  t,
}: {
  tx: Transaction
  personalBadge: { label: string; cls: string } | null
  linkedGroup?: { groupId: number; groupName: string }
  linkedSE?: SharedExpense
  onEdit: (tx: Transaction) => void
  t: ReturnType<typeof useT>
}) {
  return (
    <div className="min-w-0">
      <p className="truncate text-sm font-semibold leading-snug">{tx.description || '—'}</p>
      <TransactionMetaBadges
        tx={tx}
        personalBadge={personalBadge}
        linkedGroup={linkedGroup}
        linkedSE={linkedSE}
        onEdit={onEdit}
        t={t}
      />
    </div>
  )
}

export default function TransactionRow({
  tx,
  accountsById,
  runningBalances,
  onEdit,
  onDelete,
  linkedSE,
  onReopenSE,
  linkedGroup,
  currentUserId,
}: TransactionRowProps) {
  const t   = useT()
  const cat = getCategoryById(tx.category)
  const personalBadge = tx.personalUserId != null
    ? (tx.personalUserId === currentUserId
        ? { label: t('transactions.personalForMe'),    cls: 'border-teal-500/50 text-teal-600 dark:text-teal-400' }
        : { label: t('transactions.personalForOther'), cls: 'border-muted text-muted-foreground' })
    : null
  const transfer = isInternalTransfer(tx)
  const txBalance = tx.id != null ? runningBalances[tx.id] : undefined
  const amountColor = amountClassName(tx)
  const accountCell = accountLabel(tx, accountsById)

  return (
    <div
      className={ROW_BASE_CLASS}
      style={{ backgroundColor: `${cat.color}12` }}
    >
      <div className="absolute inset-0 bg-foreground/[0.04] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

      <span className="hidden lg:block text-sm text-muted-foreground">{formatDate(tx.date)}</span>
      <div className="hidden min-w-0 lg:block">
        <TransactionDescription
          tx={tx}
          personalBadge={personalBadge}
          linkedGroup={linkedGroup}
          linkedSE={linkedSE}
          onEdit={onEdit}
          t={t}
        />
      </div>
      <div className="hidden lg:block min-w-0">
        <div className={transfer ? 'text-sm text-muted-foreground' : 'text-sm text-muted-foreground truncate'}>
          {accountCell}
        </div>
      </div>
      <div className="hidden lg:flex items-center">
        <Badge
          variant="secondary"
          className="text-xs px-1.5 py-0 h-5 max-w-full truncate"
          style={{ borderLeft: `2px solid ${cat.color}` }}
        >
          {tCategory(cat.id, t)}
        </Badge>
      </div>

      <div className="lg:hidden flex-1 min-w-0">
        <TransactionDescription
          tx={tx}
          personalBadge={personalBadge}
          linkedGroup={linkedGroup}
          linkedSE={linkedSE}
          onEdit={onEdit}
          t={t}
        />
        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
          <Badge
            variant="secondary"
            className="text-xs px-1.5 py-0 h-5 shrink-0"
            style={{ borderLeft: `2px solid ${cat.color}` }}
          >
            {tCategory(cat.id, t)}
          </Badge>
        </div>
        <div className="text-sm text-muted-foreground mt-1">{formatDate(tx.date)}</div>
        <div className={transfer ? 'text-sm text-muted-foreground mt-0.5' : 'text-sm text-muted-foreground mt-0.5 truncate'}>
          {accountCell}
        </div>
      </div>

      <div className="shrink-0 lg:text-right">
        <span className={`block text-sm font-semibold tabular-nums ${amountColor}`}>
          {formatTxAmount(tx)}
        </span>
        {txBalance != null && (
          <div className="block text-xs text-muted-foreground/60 tabular-nums">
            {formatMoney(txBalance)}
          </div>
        )}
      </div>

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
          <DropdownMenuItem onClick={() => setTimeout(() => onEdit(tx), 0)}>
            <Pencil className="h-4 w-4 mr-2" /> Edit
          </DropdownMenuItem>
          {linkedSE && onReopenSE && linkedSE.status === 'settled' && (
            <DropdownMenuItem onClick={() => linkedSE.id != null && onReopenSE(linkedSE.id)}>
              <RotateCcw className="h-4 w-4 mr-2" /> {t('sharedExpenses.markOpen')}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            disabled={tx.id == null}
            onClick={() => tx.id != null && onDelete(tx.id)}
          >
            <Trash2 className="h-4 w-4 mr-2" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
