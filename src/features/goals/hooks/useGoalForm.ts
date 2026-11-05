import { useState } from 'react'
import { fromCents, toCents } from '@/domain/money'
import { goalBalance } from '@/domain/savingsGoals'
import type { SavingsGoalInput } from '@/data/repositories/savingsGoalsRepo'
import type { SavingsGoal } from '@/domain/types'

export type GoalFormMissing = 'name' | 'target' | 'accounts'

/** Local form state for the goal modal; the modal is mounted fresh per draft, so props seed the state once. */
export function useGoalForm(goal: SavingsGoal | undefined, balances: Record<number, number>, onSave: (input: SavingsGoalInput) => Promise<void>) {
  const [name, setName]             = useState(goal?.name ?? '')
  const [amount, setAmount]         = useState(goal?.targetCents != null ? fromCents(goal.targetCents).toFixed(2) : '')
  const [targetDate, setTargetDate] = useState(goal?.targetDate ?? '')
  const [accountIds, setAccountIds] = useState<number[]>(goal?.accountIds ?? [])
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState<string | null>(null)

  const targetCents = toCents(parseFloat(amount.replace(',', '.')) || 0)
  // Amount and date are both optional, but a goal needs at least one of them
  const hasTarget   = targetCents > 0 || targetDate !== ''
  const touched     = name !== '' || amount !== '' || targetDate !== '' || accountIds.length > 0
  // First missing field, shown once the user starts filling the form so a disabled Save is never a mystery
  const missing: GoalFormMissing | null =
    name.trim() === '' ? 'name' : !hasTarget ? 'target' : accountIds.length === 0 ? 'accounts' : null
  const canSubmit   = missing == null

  const toggleAccount = (id: number) =>
    setAccountIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setSaving(true)
    setError(null)
    try {
      await onSave({ name, targetCents: targetCents > 0 ? targetCents : null, targetDate: targetDate || null, accountIds })
    } catch (err) {
      console.error('Failed to save savings goal', err)
      // Supabase errors are plain objects with a message, not Error instances
      setError((err as { message?: string } | null)?.message ?? String(err))
    } finally {
      setSaving(false)
    }
  }

  return {
    name, setName, amount, setAmount, targetDate, setTargetDate,
    accountIds, toggleAccount,
    linkedBalance: goalBalance(accountIds, balances),
    missing: touched ? missing : null, canSubmit, saving, error, handleSubmit,
  }
}
