import { Plus, ArrowLeftRight } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import EmptyState from '@/shared/components/EmptyState'
import PageLoader from '@/shared/components/PageLoader'
import { useT } from '@/shared/i18n'
import type { Transaction, SharedExpense, Account } from '@/domain/types'
import type { ListItem } from '../pages/useTransactionsPageModel'
import TransactionRow, { TRANSACTIONS_GRID_COLS } from './TransactionRow'
import SharedExpenseRow from './SharedExpenseRow'
import GroupExpenseRow from './GroupExpenseRow'

interface Props {
  isLoading:       boolean
  listItems:       ListItem[]
  accountsById:    Record<number, Account>
  runningBalances: Record<number, number>
  txSeMap:         Record<number, SharedExpense>
  txGroupMap:      Record<number, { groupId: number; groupName: string }>
  seGroupMap:      Record<number, { groupId: number; groupName: string }>
  currentUserId?:  string
  onEditTx:        (tx: Transaction) => void
  onDeleteTx:      (id: number) => Promise<void>
  onEditSE:        (se: SharedExpense) => void
  onDeleteSE:      (id: number) => Promise<void>
  onReopen:        (id: number) => Promise<void>
  openCreateModal: () => void
}

export default function TransactionList({
  isLoading,
  listItems,
  accountsById,
  runningBalances,
  txSeMap,
  txGroupMap,
  seGroupMap,
  currentUserId,
  onEditTx,
  onDeleteTx,
  onEditSE,
  onDeleteSE,
  onReopen,
  openCreateModal,
}: Props) {
  const t = useT()

  if (isLoading) return <PageLoader message={t('transactions.loading')} />

  if (listItems.length === 0) {
    return (
      <EmptyState
        icon={ArrowLeftRight}
        title={t('transactions.noTransactions')}
        description={t('transactions.noTransactionsDesc')}
        action={
          <Button onClick={openCreateModal}>
            <Plus className="h-4 w-4 mr-2" />
            {t('transactions.addFirst')}
          </Button>
        }
      />
    )
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <div className={`hidden lg:grid ${TRANSACTIONS_GRID_COLS} gap-x-3 px-4 py-2 text-xs font-medium text-muted-foreground bg-muted/40 border-b border-border`}>
        <span>{t('transactions.colDate')}</span>
        <span>{t('transactions.colDescription')}</span>
        <span>{t('transactions.colAccount')}</span>
        <span>{t('transactions.colCategory')}</span>
        <span className="text-right">{t('transactions.colAmount')}</span>
        <span />
      </div>

      <div className="divide-y divide-border">
        {listItems.map(item =>
          item.kind === 'tx' ? (
            <TransactionRow
              key={`tx-${item.data.id}`}
              tx={item.data}
              accountsById={accountsById}
              runningBalances={runningBalances}
              onEdit={onEditTx}
              onDelete={onDeleteTx}
              linkedSE={item.data.id != null ? txSeMap[item.data.id] : undefined}
              linkedGroup={item.data.id != null ? txGroupMap[item.data.id] : undefined}
              onReopenSE={onReopen}
              currentUserId={currentUserId}
            />
          ) : item.kind === 'se' ? (
            <SharedExpenseRow
              key={`se-${item.data.id}`}
              se={item.data}
              onEdit={onEditSE}
              onDelete={onDeleteSE}
              onReopen={onReopen}
              linkedGroup={item.data.id != null ? seGroupMap[item.data.id] : undefined}
            />
          ) : (
            <GroupExpenseRow
              key={`ge-${item.data.entryId}`}
              item={item.data}
              accountsById={accountsById}
            />
          )
        )}
      </div>
    </div>
  )
}
