import { useState } from 'react'
import { format, getYear, getMonth } from 'date-fns'
import { Plus, Pencil, Trash2, ArrowLeftRight, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/shared/components/ui/table'
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
  const [month, setMonth] = useState(getMonth(now) + 1) // 1-based

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing]     = useState<Transaction | undefined>()

  const { data: transactions = [] } = useTransactionsByMonth(year, month)
  const summary                     = useMonthSummary(year, month)
  const { data: accounts     = [] } = useAccounts()

  const accountMap = Object.fromEntries(accounts.map(a => [a.id!, a.name]))
  const accountLabel = (tx: Transaction) => {
    if (tx.type === 'transfer' && tx.toAccountId != null) {
      return (
        <span className="flex items-center gap-1 text-sm text-muted-foreground">
          <span>{accountMap[tx.accountId] ?? '?'}</span>
          <ArrowRight className="h-3 w-3 shrink-0" />
          <span>{accountMap[tx.toAccountId] ?? '?'}</span>
        </span>
      )
    }
    return <span className="text-sm text-muted-foreground">{accountMap[tx.accountId] ?? '—'}</span>
  }

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

      {/* Table */}
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
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Account</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map(tx => {
                const cat = getCategoryById(tx.category)
                return (
                  <TableRow key={tx.id}>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(tx.date)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {tx.description || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className="text-xs gap-1"
                        style={{ borderLeft: `3px solid ${cat.color}` }}
                      >
                        {cat.label}
                      </Badge>
                    </TableCell>
                    <TableCell>{accountLabel(tx)}</TableCell>
                    <TableCell className="text-right font-semibold">
                      <span className={tx.amount >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                        {tx.amount >= 0 ? '+' : ''}
                        {formatMoney(tx.amount)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
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
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <TransactionFormModal open={modalOpen} onClose={handleClose} transaction={editing} />
    </div>
  )
}
