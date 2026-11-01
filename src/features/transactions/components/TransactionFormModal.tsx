import { useCallback, useLayoutEffect, useRef, useState } from 'react'
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
  return {
    description: tx.description,
    amount:      Math.abs(fromCents(tx.amount)).toFixed(2),
    date:        tx.date,
    accountId:   String(tx.accountId),
    toAccountId: tx.toAccountId != null ? String(tx.toAccountId) : undefined,
    category:    tx.category,
  }
}

// Partial reports from a tab only overwrite the fields they actually carry
function mergeCarryOver(prev: SharedFormOverride, next: SharedFormOverride): SharedFormOverride {
  const defined = Object.entries(next).filter(([, value]) => value !== undefined)
  return { ...prev, ...Object.fromEntries(defined) }
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
  // Live values are tracked in a ref; the snapshot handed to the next tab is only taken on tab switch
  const liveValues = useRef<SharedFormOverride>({})
  const [carryOver, setCarryOver] = useState<SharedFormOverride>({})
  const handleValuesChange = useCallback((values: SharedFormOverride) => {
    liveValues.current = mergeCarryOver(liveValues.current, values)
  }, [])
  const linkedGroup = useLinkedGroupEntry({
    open,
    transactionId: editedTx?.id,
    sharedExpenseId: sharedExpense?.id,
  })

  useLayoutEffect(() => {
    // Cleared on close too, so a reopened form never mounts with the previous entry's values
    const initial = open && duplicate && transaction ? carryOverFrom(transaction) : {}
    liveValues.current = initial
    setCarryOver(initial)
    if (open) setViewType(resolveInitialViewType({ transaction, sharedExpense, defaultType }))
  }, [open, transaction, sharedExpense, defaultType, duplicate])

  useLayoutEffect(() => {
    if (!open || !linkedGroup.entry) return
    setViewType('groups')
  }, [open, linkedGroup.entry])

  const handleViewTypeChange = (nextViewType: ViewType) => {
    ;(document.activeElement as HTMLElement | null)?.blur()
    setCarryOver(liveValues.current)
    setViewType(nextViewType)
  }

  const activeTabs = linkedGroup.entry ? (['groups'] as const) : []

  return (
    <Dialog open={open} onOpenChange={isOpen => !isOpen && onClose()}>
      <DialogContent className={styles.dialog} aria-describedby={undefined}>
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
            onValuesChange={isEditTx ? undefined : handleValuesChange}
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
            onValuesChange={isEditTx ? undefined : handleValuesChange}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
