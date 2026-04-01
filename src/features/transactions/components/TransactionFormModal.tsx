import { useLayoutEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { useSortedAccounts } from '@/shared/hooks/useAccounts'
import { useGroups } from '@/shared/hooks/useGroups'
import { useAuth } from '@/features/auth/AuthContext'
import { useT } from '@/shared/i18n'
import TransactionTypeTabs from './TransactionTypeTabs'
import StandardTransactionTab from './StandardTransactionTab'
import GroupTransactionTab from './GroupTransactionTab'
import { useLinkedGroupEntry } from './useLinkedGroupEntry'
import type { SharedExpense, Transaction, TransactionType } from '@/domain/types'

type ViewType = TransactionType | 'groups'

interface Props {
  open: boolean
  onClose: () => void
  transaction?: Transaction
  sharedExpense?: SharedExpense
  defaultType?: ViewType
  defaultAccountId?: string
}

function resolveInitialViewType({
  transaction,
  sharedExpense,
  defaultType,
}: Pick<Props, 'transaction' | 'sharedExpense' | 'defaultType'>): ViewType {
  if (transaction) return transaction.type
  if (sharedExpense) return 'groups'
  return defaultType ?? 'expense'
}

export default function TransactionFormModal({
  open,
  onClose,
  transaction,
  sharedExpense,
  defaultType,
  defaultAccountId,
}: Props) {
  const t = useT()
  const { user } = useAuth()
  const { data: accounts = [] } = useSortedAccounts()
  const { data: rawGroups = [] } = useGroups()
  const groups = rawGroups.filter((group): group is typeof group & { id: number } => group.id != null)
  const isEditTx = transaction != null || sharedExpense != null

  const [viewType, setViewType] = useState<ViewType>('expense')
  const linkedGroup = useLinkedGroupEntry({
    open,
    transactionId: transaction?.id,
    sharedExpenseId: sharedExpense?.id,
  })

  useLayoutEffect(() => {
    if (!open) return
    setViewType(resolveInitialViewType({ transaction, sharedExpense, defaultType }))
  }, [open, transaction, sharedExpense, defaultType])

  useLayoutEffect(() => {
    if (!open || !linkedGroup.entry) return
    setViewType('groups')
  }, [open, linkedGroup.entry])

  const handleViewTypeChange = (nextViewType: ViewType) => {
    ;(document.activeElement as HTMLElement | null)?.blur()
    setViewType(nextViewType)
  }

  const activeTabs = linkedGroup.entry ? (['groups'] as const) : []

  return (
    <Dialog open={open} onOpenChange={isOpen => !isOpen && onClose()}>
      <DialogContent
        className="sm:max-w-lg max-h-[90vh] overflow-y-auto"
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle>
            {isEditTx ? t('transactions.editTitle') : t('transactions.newTitle')}
          </DialogTitle>
        </DialogHeader>

        <TransactionTypeTabs
          value={viewType}
          onChange={handleViewTypeChange}
          activeTabs={activeTabs as ViewType[]}
        />

        {viewType === 'groups' ? (
          <GroupTransactionTab
            key={`groups-${transaction?.id ?? sharedExpense?.id ?? 'new'}`}
            open={open}
            onClose={onClose}
            transaction={transaction}
            sharedExpense={sharedExpense}
            accounts={accounts}
            groups={groups}
            currentUserId={user?.id}
          />
        ) : (
          <StandardTransactionTab
            key={`${viewType}-${transaction?.id ?? 'new'}`}
            open={open}
            onClose={onClose}
            transaction={transaction}
            defaultType={viewType}
            defaultAccountId={defaultAccountId}
            isEditTx={isEditTx}
            currentUserId={user?.id}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
