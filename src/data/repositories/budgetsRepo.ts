import { supabase } from '@/data/supabase'
import type { Budget } from '@/domain/types'

type BudgetRow = {
  id:           number
  category:     string
  amount_cents: number
}

function toBudget(row: BudgetRow): Budget {
  return { id: row.id, category: row.category, amountCents: Number(row.amount_cents) }
}

export const budgetsRepo = {
  getAll: async (): Promise<Budget[]> => {
    const { data, error } = await supabase
      .from('budgets')
      .select('id, category, amount_cents')
    if (error) throw error
    return (data as BudgetRow[]).map(toBudget)
  },

  // One budget per category — saving an existing category replaces its amount
  save: async (category: string, amountCents: number): Promise<void> => {
    const { error } = await supabase
      .from('budgets')
      .upsert(
        { category, amount_cents: Math.round(amountCents), updated_at: new Date().toISOString() },
        { onConflict: 'user_id,category' },
      )
    if (error) throw error
  },

  remove: async (id: number): Promise<void> => {
    const { error } = await supabase.from('budgets').delete().eq('id', id)
    if (error) throw error
  },
}
