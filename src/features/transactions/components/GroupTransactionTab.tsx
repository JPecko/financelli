import { useGroupTransactionForm } from './useGroupTransactionForm'
import GroupTransactionForm from './GroupTransactionForm'
import type { SharedFormOverride } from './useTransactionForm'
import type { Account, SharedExpense, Transaction } from '@/domain/types'

interface Props {
  open: boolean
  onClose: () => void
  transaction?: Transaction
  sharedExpense?: SharedExpense
  accounts: Account[]
  groups: { id: number; name: string }[]
  currentUserId?: string
  initialOverride?: SharedFormOverride
  onValuesChange?: (values: SharedFormOverride) => void
}

export default function GroupTransactionTab({
  open,
  onClose,
  transaction,
  sharedExpense,
  accounts,
  groups,
  currentUserId,
  initialOverride,
  onValuesChange,
}: Props) {
  const grpHook = useGroupTransactionForm({
    open, onClose, transaction, sharedExpense, accounts, groups, initialOverride, onValuesChange,
  })

  return (
    <GroupTransactionForm
      onClose={onClose}
      onSubmit={grpHook.onSubmit}
      groups={groups}
      accounts={accounts}
      register={grpHook.register}
      watch={grpHook.watch}
      setValue={grpHook.setValue}
      errors={grpHook.errors}
      isSubmitting={grpHook.isSubmitting}
      members={grpHook.members}
      splits={grpHook.splits}
      splitMode={grpHook.splitMode}
      setSplitMode={grpHook.setSplitMode}
      percents={grpHook.percents}
      splitError={grpHook.splitError}
      createTx={grpHook.createTx}
      setCreateTx={grpHook.setCreateTx}
      roundupEnabled={grpHook.roundupEnabled}
      setRoundupEnabled={grpHook.setRoundupEnabled}
      txAccount={grpHook.txAccount}
      linkedEntry={grpHook.linkedEntry}
      myMember={grpHook.myMember}
      myShareCents={grpHook.myShareCents}
      othersOweCents={grpHook.othersOweCents}
      totalCents={grpHook.totalCents}
      canSubmit={grpHook.canSubmit}
      currentUserId={currentUserId}
      handlePercentChange={grpHook.handlePercentChange}
      handleAmountChange={grpHook.handleAmountChange}
      setMemberFull={grpHook.setMemberFull}
      setMemberEmpty={grpHook.setMemberEmpty}
    />
  )
}
