import { useState } from 'react'
import { format, getYear, getMonth } from 'date-fns'
import { Plus, Pencil, Trash2, ArrowLeftRight, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { useTransactionsByMonth, useMonthSummary, removeTransaction } from '@/shared/hooks/useTransactions'
import { useAccounts } from '@/shared/hooks/useAccounts'
import { formatMoney } from '@/domain/money'
import { formatDate } from '@/shared/utils/format'
import { getCategoryById } from '@/domain/categories'
import EmptyState from '@/shared/components/EmptyState'
import TransactionFormModal from '../components/TransactionFormModal'
import type { Transaction } from '@/domain/types'

export default function TransactionsPage() {
  const now = new Date()
  const [year, setYear]   = useState(getYear(now))
  const [month, setMonth] = useState(getMonth(now) + 1)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing]     = useState<Transaction | undefined>()

  const { data: transactions = [] } = useTransactionsByMonth(year, month)
  const summary                     = useMonthSummary(year, month)
  const { data: accounts     = [] } = useAccounts()

  const accountMap = Object.fromEntries(accounts.map(a => [a.id!, a.name]))

  const currentDate = new Date(year, month - 1, 1)

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else              { setMonth(m => m - 1) }
  }
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else               { setMonth(m => m + 1) }
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

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Transactions</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {format(currentDate, 'MMMM yyyy')}
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Transaction
        </Button>
      </div>

      {/* Month navigation + summary */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-2 rounded-lg border px-3 py-1.5">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium w-28 text-center">
            {format(currentDate, 'MMM yyyy')}
          </span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex gap-4 text-sm flex-wrap">
            <span className="text-emerald-600 font-medium">
              +{formatMoney(summary.personalIncome)}
            </span>
            <span className="text-rose-600 font-medium">
              -{formatMoney(Math.abs(summary.personalExpenses))}
            </span>
            <span className={`font-semibold ${summary.personalBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              = {formatMoney(summary.personalBalance)}
            </span>
          </div>
          {(summary.personalIncome !== summary.income || summary.personalExpenses !== summary.expenses) && (
            <div className="flex gap-3 text-xs text-muted-foreground">
              <span>Total: +{formatMoney(summary.income)}</span>
              <span>-{formatMoney(Math.abs(summary.expenses))}</span>
            </div>
          )}
        </div>
      </div>

      {/* List */}
      {transactions.length === 0 ? (
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
        <div className="rounded-lg border overflow-hidden divide-y divide-border">
          {transactions.map(tx => {
            const cat        = getCategoryById(tx.category)
            const isTransfer = tx.type === 'transfer' && tx.toAccountId != null
            const isIncome   = tx.amount >= 0 && tx.type !== 'transfer'
            const amountColor = isTransfer
              ? 'text-blue-600 dark:text-blue-400'
              : isIncome ? 'text-emerald-600' : 'text-rose-600'

            const accountCell = isTransfer ? (
                <span className="flex items-center gap-0.5 min-w-0 truncate">
                  <span className="truncate">{accountMap[tx.accountId] ?? '?'}</span>
                  <ArrowRight className="h-3 w-3 shrink-0" />
                  <span className="truncate">{accountMap[tx.toAccountId!] ?? '?'}</span>
                </span>
              ) : (
                <span className="truncate">{accountMap[tx.accountId] ?? '—'}</span>
              )

            return (
              <div
                key={tx.id}
                className="relative flex items-center gap-3 px-4 py-3 transition-colors group"
                style={{ backgroundColor: `${cat.color}12` }}
              >
                {/* Hover overlay — avoids inline-style specificity conflicts */}
                <div className="absolute inset-0 bg-foreground/[0.04] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                {/* ── Desktop (sm+): date · description · category · account ── */}
                <div className="hidden sm:flex flex-1 min-w-0 items-center gap-3">
                  <span className="text-sm text-muted-foreground shrink-0 w-24">
                    {formatDate(tx.date)}
                  </span>
                  <p className="text-sm font-semibold truncate flex-1 leading-snug">
                    {tx.description || '—'}
                  </p>
                  <div className="flex items-center gap-1.5 shrink-0 text-sm text-muted-foreground">
                    <Badge
                      variant="secondary"
                      className="text-xs px-1.5 py-0 h-5"
                      style={{ borderLeft: `2px solid ${cat.color}` }}
                    >
                      {cat.label}
                    </Badge>
                    <span>·</span>
                    <span className="max-w-[160px] truncate">{accountCell}</span>
                  </div>
                </div>

                {/* ── Mobile: 3 lines ── */}
                <div className="sm:hidden flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate leading-snug">
                    {tx.description || '—'}
                  </p>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                    <span className="shrink-0">{formatDate(tx.date)}</span>
                    <span className="shrink-0">·</span>
                    <Badge
                      variant="secondary"
                      className="text-xs px-1.5 py-0 h-5 shrink-0"
                      style={{ borderLeft: `2px solid ${cat.color}` }}
                    >
                      {cat.label}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground mt-0.5 truncate">
                    {accountCell}
                  </div>
                </div>

                {/* Amount */}
                <span className={`text-sm font-semibold shrink-0 tabular-nums ${amountColor}`}>
                  {isTransfer
                    ? formatMoney(Math.abs(tx.amount))
                    : `${tx.amount >= 0 ? '+' : ''}${formatMoney(tx.amount)}`
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
      )}

      <TransactionFormModal open={modalOpen} onClose={handleClose} transaction={editing} />
    </div>
  )
}
