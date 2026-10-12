import { useLayoutEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import styles from './TransactionFormModal.module.scss'
import { useSortedAccounts } from '@/shared/hooks/useAccounts'
import { useGroups } from '@/shared/hooks/useGroups'
import { useAuth } from '@/features/auth/AuthContext'
import { useT } from '@/shared/i18n'
import TransactionTypeTabs from './TransactionTypeTabs'
import StandardTransactionTab from './StandardTransactionTab'
import GroupTransactionTab from './GroupTransactionTab'
import { useLinkedGroupEntry } from './useLinkedGroupEntry'
import type { SharedFormOverride } from './useTransactionForm'
import { fromCents } from '@/domain/money'
import type { SharedExpense, Transaction, TransactionType } from '@/domain/types'

type ViewType = TransactionType | 'groups'

interface Props {
  open: boolean
  onClose: () => void
  transaction?: Transaction
  sharedExpense?: SharedExpense
  duplicate?: boolean
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

function carryOverFrom(tx: Transaction): SharedFormOverride {
  return { description: tx.description, amount: Math.abs(fromCents(tx.amount)).toFixed(2), date: tx.date }
}

export default function TransactionFormModal({
  open,
  onClose,
  transaction,
  sharedExpense,
  duplicate = false,
  defaultType,
  defaultAccountId,
}: Props) {
  const t = useT()
  const { user } = useAuth()
  const { data: accounts = [] } = useSortedAccounts()
  const { data: rawGroups = [] } = useGroups()
  const groups = rawGroups.filter((group): group is typeof group & { id: number } => group.id != null)
  // Duplicating reuses the transaction as a template only — the form behaves as a new entry
  const isEditTx = !duplicate && (transaction != null || sharedExpense != null)
  const editedTx = duplicate ? undefined : transaction

  const [viewType, setViewType] = useState<ViewType>('expense')
  // Carries description/amount/date between the Personal and Group tabs while creating a new entry
  const [carryOver, setCarryOver] = useState<SharedFormOverride>({})
  const linkedGroup = useLinkedGroupEntry({
    open,
    transactionId: editedTx?.id,
    sharedExpenseId: sharedExpense?.id,
  })

  useLayoutEffect(() => {
    if (!open) return
    setViewType(resolveInitialViewType({ transaction, sharedExpense, defaultType }))
    setCarryOver(duplicate && transaction ? carryOverFrom(transaction) : {})
  }, [open, transaction, sharedExpense, defaultType, duplicate])

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
        className={`${styles.dialog} max-h-[90vh] overflow-y-auto`}
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle>
            {isEditTx ? t('transactions.editTitle') : duplicate ? t('transactions.duplicateTitle') : t('transactions.newTitle')}
          </DialogTitle>
        </DialogHeader>

        <TransactionTypeTabs
          value={viewType}
          onChange={handleViewTypeChange}
          activeTabs={activeTabs as ViewType[]}
        />

        {viewType === 'groups' ? (
          <GroupTransactionTab
            key={`groups-${editedTx?.id ?? sharedExpense?.id ?? 'new'}`}
            open={open}
            onClose={onClose}
            transaction={editedTx}
            sharedExpense={sharedExpense}
            accounts={accounts}
            groups={groups}
            currentUserId={user?.id}
            initialOverride={isEditTx ? undefined : carryOver}
            onValuesChange={isEditTx ? undefined : setCarryOver}
          />
        ) : (
          <StandardTransactionTab
            key={`${viewType}-${transaction?.id ?? 'new'}`}
            open={open}
            onClose={onClose}
            transaction={transaction}
            duplicate={duplicate}
            defaultType={viewType}
            defaultAccountId={defaultAccountId}
            isEditTx={isEditTx}
            currentUserId={user?.id}
            initialOverride={isEditTx ? undefined : carryOver}
            onValuesChange={isEditTx ? undefined : setCarryOver}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
