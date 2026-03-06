import { useState } from 'react'
import { format, getYear, getMonth } from 'date-fns'
import { Plus, Pencil, Trash2, ArrowLeftRight, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { useTransactionsByMonth, useMonthSummary, useRunningBalances, removeTransaction } from '@/shared/hooks/useTransactions'
import { useAccounts } from '@/shared/hooks/useAccounts'
import { formatMoney } from '@/domain/money'
import { formatDate } from '@/shared/utils/format'
import { getCategoryById } from '@/domain/categories'
import EmptyState from '@/shared/components/EmptyState'
import PageLoader from '@/shared/components/PageLoader'
import TransactionFormModal from '../components/TransactionFormModal'
import type { Transaction } from '@/domain/types'

// Desktop grid column template — must match the header row
const GRID_COLS = 'sm:grid-cols-[54px_1fr_220px_120px_80px_28px]'

export default function TransactionsPage() {
  const now = new Date()
  const [year, setYear]   = useState(getYear(now))
  const [month, setMonth] = useState(getMonth(now) + 1)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing]     = useState<Transaction | undefined>()

  const { data: transactions = [], isLoading } = useTransactionsByMonth(year, month)
  const summary                     = useMonthSummary(year, month)
  const { data: accounts     = [] } = useAccounts()
  const runningBalances              = useRunningBalances(year, month)

  const accountMap  = Object.fromEntries(accounts.map(a => [a.id!, a.name]))
  const currentDate = new Date(year, month - 1, 1)

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else             { setMonth(m => m - 1) }
  }
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else              { setMonth(m => m + 1) }
  }

  const handleEdit = (tx: Transaction) => {
    setEditing(tx)
    setModalOpen(true)
  }

  const handleClose = () => {
    setModalOpen(false)
    setEditing(undefined)
  }

  const handleDelete = async (id: number | undefined) => {
    if (id == null) return
    if (confirm('Delete this transaction?')) {
      await removeTransaction(id)
    }
  }

  const hasSplit = summary.personalIncome !== summary.income || summary.personalExpenses !== summary.expenses
  const summaryEl = (
    <div className="flex flex-col gap-1">
      <div className="flex gap-4 text-sm flex-wrap">
        <span className="text-emerald-600 font-medium">+{formatMoney(summary.personalIncome)}</span>
        <span className="text-rose-600 font-medium">-{formatMoney(Math.abs(summary.personalExpenses))}</span>
        <span className={`font-semibold ${summary.personalBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
          = {formatMoney(summary.personalBalance)}
        </span>
      </div>
      {hasSplit && (
        <div className="flex gap-3 text-xs text-muted-foreground">
          <span>Total: +{formatMoney(summary.income)}</span>
          <span>-{formatMoney(Math.abs(summary.expenses))}</span>
        </div>
      )}
    </div>
  )

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Transactions</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{format(currentDate, 'MMMM yyyy')}</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Transaction
        </Button>
      </div>

      {/* Month navigation + summary */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <div className="flex items-center gap-2 rounded-lg border px-3 py-1.5">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium w-28 text-center">{format(currentDate, 'MMM yyyy')}</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        {summaryEl}
      </div>

      {/* Transaction list */}
      {isLoading ? (
        <PageLoader message="Loading transactions..." />
      ) : transactions.length === 0 ? (
        <EmptyState
          icon={ArrowLeftRight}
          title="No transactions this month"
          description="Start adding your income and expenses to track your monthly spending."
          action={
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add first transaction
            </Button>
          }
        />
      ) : (
        <div className="rounded-lg border overflow-hidden">

          {/* Desktop column headers */}
          <div className={`hidden sm:grid ${GRID_COLS} gap-x-3 px-4 py-2 text-xs font-medium text-muted-foreground bg-muted/40 border-b border-border`}>
            <span>Date</span>
            <span>Description</span>
            <span>Account</span>
            <span>Category</span>
            <span className="text-right">Amount</span>
            <span />
          </div>

          <div className="divide-y divide-border">
            {transactions?.map(tx => {
              const cat        = getCategoryById(tx.category)
              const isTransfer = tx.type === 'transfer' && tx.toAccountId != null
              const isIncome   = tx.amount >= 0 && tx.type !== 'transfer'
              const amountColor = isTransfer
                ? 'text-blue-600 dark:text-blue-400'
                : isIncome ? 'text-emerald-600' : 'text-rose-600'

              const accountName = isTransfer ? (
                <span className="flex items-center gap-0.5 min-w-0 truncate">
                  <span className="truncate">{accountMap[tx.accountId] ?? '?'}</span>
                  <ArrowRight className="h-3 w-3 shrink-0" />
                  <span className="truncate">{accountMap[tx.toAccountId!] ?? '?'}</span>
                </span>
              ) : (
                <span className="truncate">{accountMap[tx.accountId] ?? '—'}</span>
              )
              const txBalance = tx.id != null ? runningBalances[tx.id] : undefined

              return (
                <div
                  key={tx.id}
                  className={`relative px-4 py-3 transition-colors group flex items-center gap-3 sm:grid ${GRID_COLS} sm:gap-x-3 sm:items-center`}
                  style={{ backgroundColor: `${cat.color}12` }}
                >
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-foreground/[0.04] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                  {/* ── Desktop: individual column cells ── */}
                  <span className="hidden sm:block text-sm text-muted-foreground">
                    {formatDate(tx.date)}
                  </span>
                  <p className="hidden sm:block text-sm font-semibold truncate leading-snug">
                    {tx.description || '—'}
                  </p>
                  <div className="hidden sm:block min-w-0">
                    <div className="text-sm text-muted-foreground truncate">{accountName}</div>
                  </div>
                  <div className="hidden sm:flex items-center">
                    <Badge
                      variant="secondary"
                      className="text-xs px-1.5 py-0 h-5 max-w-full truncate"
                      style={{ borderLeft: `2px solid ${cat.color}` }}
                    >
                      {cat.label}
                    </Badge>
                  </div>

                  {/* ── Mobile: 3-line layout ── */}
                  <div className="sm:hidden flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate leading-snug">
                      {tx.description || '—'}
                    </p>
                    <div className="mt-1">
                      <Badge
                        variant="secondary"
                        className="text-xs px-1.5 py-0 h-5 shrink-0"
                        style={{ borderLeft: `2px solid ${cat.color}` }}
                      >
                        {cat.label}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      <span className="shrink-0">{formatDate(tx.date)}</span>
                    </div>
                    <div className="text-sm text-muted-foreground mt-0.5 truncate">
                      {accountName}
                    </div>
                  </div>

                  {/* Amount + desktop running balance */}
                  <div className="shrink-0 sm:text-right">
                    <span className={`block text-sm font-semibold tabular-nums ${amountColor}`}>
                      {isTransfer
                        ? formatMoney(Math.abs(tx.amount))
                        : `${tx.amount >= 0 ? '+' : ''}${formatMoney(tx.amount)}`
                      }
                    </span>
                    {txBalance != null && (
                      <div className="block text-xs text-muted-foreground/60 tabular-nums">
                        {formatMoney(txBalance)}
                      </div>
                    )}
                  </div>


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
                      <DropdownMenuItem onClick={() => handleEdit(tx)}>
                        <Pencil className="h-4 w-4 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => handleDelete(tx.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <TransactionFormModal open={modalOpen} onClose={handleClose} transaction={editing} />
    </div>
  )
}
