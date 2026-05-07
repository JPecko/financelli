import { format } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { Plus, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { useT } from '@/shared/i18n'
import { useAuth } from '@/features/auth/AuthContext'
import { useTransactionsPageModel } from './useTransactionsPageModel'
import TransactionFormModal from '../components/TransactionFormModal'
import TransactionFilterPopover from '../components/TransactionFilterPopover'
import TransactionTotalsBar from '../components/TransactionTotalsBar'
import TransactionList from '../components/TransactionList'

export default function TransactionsPage() {
  const t = useT()
  const { user } = useAuth()
  const navigate = useNavigate()
  const m = useTransactionsPageModel()

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">{t('transactions.title')}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{format(m.currentDate, 'MMMM yyyy')}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => navigate('/recurring')}>
            <RefreshCw className="h-4 w-4" />
            {t('nav.recurring')}
          </Button>
          <Button size="sm" onClick={m.openCreateModal}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{t('transactions.addTransaction')}</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>

      {/* Month nav + Totals + Filter */}
      <div className="flex flex-col gap-2 mb-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-lg border px-3 py-1.5">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={m.prevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium w-28 text-center">
                {format(m.currentDate, 'MMM yyyy')}
              </span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={m.nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <TransactionTotalsBar {...m.filteredTotals} className="hidden md:flex" />
          </div>
          <TransactionFilterPopover
            accounts={m.accounts}
            categoriesInMonth={m.categoriesInMonth}
            filterAccountId={m.filterAccountId}
            filterCategory={m.filterCategory}
            filterSource={m.filterSource}
            activeFilterCount={m.activeFilterCount}
            setFilterAccountId={m.setFilterAccountId}
            setFilterCategory={m.setFilterCategory}
            setFilterSource={m.setFilterSource}
            clearFilters={m.clearFilters}
          />
        </div>
        <TransactionTotalsBar {...m.filteredTotals} className="md:hidden" />
      </div>

      <TransactionList
        isLoading={m.isLoading}
        listItems={m.listItems}
        accountsById={m.accountsById}
        runningBalances={m.runningBalances}
        txSeMap={m.txSeMap}
        txGroupMap={m.txGroupMap}
        seGroupMap={m.seGroupMap}
        currentUserId={user?.id}
        onEditTx={m.handleEdit}
        onDeleteTx={m.handleDelete}
        onEditSE={m.handleEditSE}
        onDeleteSE={m.handleDeleteSE}
        onReopen={m.handleReopen}
        openCreateModal={m.openCreateModal}
      />

      <TransactionFormModal
        open={m.modalOpen}
        onClose={m.handleClose}
        transaction={m.editingTx}
        sharedExpense={m.editingSE}
        defaultAccountId={!m.editingTx && !m.editingSE && m.filterAccountId != null ? String(m.filterAccountId) : undefined}
      />
    </div>
  )
}
