import { supabase } from '@/data/supabase'
import type { SavingsGoal } from '@/domain/types'

type SavingsGoalRow = {
  id:           number
  name:         string
  target_cents: number | null
  target_date:  string | null
  account_ids:  number[] | null
  created_at:   string
}

export type SavingsGoalInput = Pick<SavingsGoal, 'name' | 'targetCents' | 'targetDate' | 'accountIds'>

function toGoal(row: SavingsGoalRow): SavingsGoal {
  return {
    id:          row.id,
    name:        row.name,
    targetCents: row.target_cents == null ? null : Number(row.target_cents),
    targetDate:  row.target_date,
    accountIds:  (row.account_ids ?? []).map(Number),
    createdAt:   row.created_at,
  }
}

function toRow(input: SavingsGoalInput) {
  return {
    name:         input.name.trim(),
    target_cents: input.targetCents == null ? null : Math.round(input.targetCents),
    target_date:  input.targetDate || null,
    account_ids:  input.accountIds,
    updated_at:   new Date().toISOString(),
  }
}

export const savingsGoalsRepo = {
  getAll: async (): Promise<SavingsGoal[]> => {
    const { data, error } = await supabase
      .from('savings_goals')
      .select('id, name, target_cents, target_date, account_ids, created_at')
      .order('created_at')
    if (error) throw error
    return (data as SavingsGoalRow[]).map(toGoal)
  },

  add: async (input: SavingsGoalInput): Promise<void> => {
    const { error } = await supabase.from('savings_goals').insert(toRow(input))
    if (error) throw error
  },

  update: async (id: number, input: SavingsGoalInput): Promise<void> => {
    const { error } = await supabase.from('savings_goals').update(toRow(input)).eq('id', id)
    if (error) throw error
  },

  remove: async (id: number): Promise<void> => {
    const { error } = await supabase.from('savings_goals').delete().eq('id', id)
    if (error) throw error
  },
}
