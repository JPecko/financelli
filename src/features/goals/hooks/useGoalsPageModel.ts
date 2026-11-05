import { useMemo, useState } from 'react'
import { useGoalsOverview } from './useGoalsOverview'
import { removeSavingsGoal, saveSavingsGoal } from '@/shared/hooks/useSavingsGoals'
import { groupAccounts } from '@/domain/accountGrouping'
import type { SavingsGoalInput } from '@/data/repositories/savingsGoalsRepo'
import type { Account, SavingsGoal } from '@/domain/types'

// What the form modal edits: an existing goal, or a new one
export type GoalDraft = { goal?: SavingsGoal }

export function useGoalsPageModel() {
  const overview = useGoalsOverview()
  const [draft, setDraft] = useState<GoalDraft | null>(null)
  const [pendingDelete, setPendingDelete] = useState<SavingsGoal | null>(null)

  const accountsById = useMemo<Record<number, Account>>(
    () => Object.fromEntries(overview.accounts.map(a => [a.id!, a])),
    [overview.accounts],
  )
  // Credit cards hold debt, not savings
  const linkableAccounts = useMemo(
    () => groupAccounts(overview.accounts.filter(a => a.id != null && a.type !== 'credit')),
    [overview.accounts],
  )

  const handleSave = async (input: SavingsGoalInput) => {
    await saveSavingsGoal(input, draft?.goal?.id)
    setDraft(null)
  }

  const handleConfirmDelete = async () => {
    if (pendingDelete?.id == null) return
    await removeSavingsGoal(pendingDelete.id)
    setPendingDelete(null)
    setDraft(null)
  }

  return {
    ...overview,
    accountsById, linkableAccounts,
    draft,
    openNew:   () => setDraft({}),
    openEdit:  (goal: SavingsGoal) => setDraft({ goal }),
    closeForm: () => setDraft(null),
    handleSave,
    pendingDelete,
    requestDelete: setPendingDelete,
    cancelDelete:  () => setPendingDelete(null),
    handleConfirmDelete,
  }
}
