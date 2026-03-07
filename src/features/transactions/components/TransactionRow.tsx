import { Pencil, Trash2, ArrowRight } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { formatMoney } from '@/domain/money'
import { formatDate } from '@/shared/utils/format'
import { getCategoryById } from '@/domain/categories'
import type { Transaction } from '@/domain/types'

export const TRANSACTIONS_GRID_COLS = 'md:grid-cols-[54px_1fr_220px_120px_80px_28px]'

const ROW_BASE_CLASS =
  `relative px-4 py-3 transition-colors group flex items-center gap-3 md:grid ${TRANSACTIONS_GRID_COLS} md:gap-x-3 md:items-center`

interface TransactionRowProps {
  tx: Transaction
  accountMap: Record<number, string>
  runningBalances: Record<number, number>
  onEdit: (tx: Transaction) => void
  onDelete: (id: number) => Promise<void>
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

function accountLabel(tx: Transaction, accountMap: Record<number, string>) {
  if (isInternalTransfer(tx)) {
    return (
      <span className="flex flex-col min-w-0 leading-tight">
        <span className="truncate">{accountMap[tx.accountId] ?? '?'}</span>
        <span className="flex items-center gap-1 min-w-0">
          <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground/70" aria-hidden="true" />
          <span className="truncate">{accountMap[tx.toAccountId!] ?? '?'}</span>
        </span>
      </span>
    )
  }
  return <span className="truncate">{accountMap[tx.accountId] ?? '—'}</span>
}

export default function TransactionRow({
  tx,
  accountMap,
  runningBalances,
  onEdit,
  onDelete,
}: TransactionRowProps) {
  const cat = getCategoryById(tx.category)
  const transfer = isInternalTransfer(tx)
  const txBalance = tx.id != null ? runningBalances[tx.id] : undefined
  const amountColor = amountClassName(tx)
  const accountCell = accountLabel(tx, accountMap)

  return (
    <div
      className={ROW_BASE_CLASS}
      style={{ backgroundColor: `${cat.color}12` }}
    >
      <div className="absolute inset-0 bg-foreground/[0.04] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

      <span className="hidden md:block text-sm text-muted-foreground">{formatDate(tx.date)}</span>
      <p className="hidden md:block text-sm font-semibold truncate leading-snug">{tx.description || '—'}</p>
      <div className="hidden md:block min-w-0">
        <div className={transfer ? 'text-sm text-muted-foreground' : 'text-sm text-muted-foreground truncate'}>
          {accountCell}
        </div>
      </div>
      <div className="hidden md:flex items-center">
        <Badge
          variant="secondary"
          className="text-xs px-1.5 py-0 h-5 max-w-full truncate"
          style={{ borderLeft: `2px solid ${cat.color}` }}
        >
          {cat.label}
        </Badge>
      </div>

      <div className="md:hidden flex-1 min-w-0">
        <p className="text-sm font-semibold truncate leading-snug">{tx.description || '—'}</p>
        <div className="mt-1">
          <Badge
            variant="secondary"
            className="text-xs px-1.5 py-0 h-5 shrink-0"
            style={{ borderLeft: `2px solid ${cat.color}` }}
          >
            {cat.label}
          </Badge>
        </div>
        <div className="text-sm text-muted-foreground mt-1">{formatDate(tx.date)}</div>
        <div className={transfer ? 'text-sm text-muted-foreground mt-0.5' : 'text-sm text-muted-foreground mt-0.5 truncate'}>
          {accountCell}
        </div>
      </div>

      <div className="shrink-0 md:text-right">
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
          <DropdownMenuItem onClick={() => onEdit(tx)}>
            <Pencil className="h-4 w-4 mr-2" /> Edit
          </DropdownMenuItem>
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
