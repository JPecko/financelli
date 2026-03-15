import { supabase } from '@/data/supabase'
import type { Holding } from '@/domain/types'

type HoldingRow = {
  id: number
  user_id: string
  account_id: number
  name: string
  ticker: string | null
  quantity: number
  avg_cost: number
  current_price: number
  created_at: string
}

function toHolding(row: HoldingRow): Holding {
  return {
    id:           row.id,
    accountId:    row.account_id,
    name:         row.name,
    ticker:       row.ticker ?? undefined,
    quantity:     Number(row.quantity),
    avgCost:      row.avg_cost,
    currentPrice: row.current_price,
    createdAt:    row.created_at,
  }
}

export const holdingsRepo = {
  getAll: async (): Promise<Holding[]> => {
    const { data, error } = await supabase
      .from('holdings')
      .select('*')
      .order('name')
    if (error) throw error
    return (data as HoldingRow[]).map(toHolding)
  },

  getByAccount: async (accountId: number): Promise<Holding[]> => {
    const { data, error } = await supabase
      .from('holdings')
      .select('*')
      .eq('account_id', accountId)
      .order('name')
    if (error) throw error
    return (data as HoldingRow[]).map(toHolding)
  },

  add: async (holding: Omit<Holding, 'id' | 'createdAt'>): Promise<Holding> => {
    const { data, error } = await supabase
      .from('holdings')
      .insert({
        account_id:    holding.accountId,
        name:          holding.name,
        ticker:        holding.ticker ?? null,
        quantity:      holding.quantity,
        avg_cost:      holding.avgCost,
        current_price: holding.currentPrice,
      })
      .select()
      .single()
    if (error) throw error
    return toHolding(data as HoldingRow)
  },

  update: async (id: number, changes: Partial<Holding>): Promise<void> => {
    const row: Record<string, unknown> = {}
    if (changes.name         !== undefined) row.name          = changes.name
    if (changes.ticker       !== undefined) row.ticker        = changes.ticker ?? null
    if (changes.quantity     !== undefined) row.quantity      = changes.quantity
    if (changes.avgCost      !== undefined) row.avg_cost      = changes.avgCost
    if (changes.currentPrice !== undefined) row.current_price = changes.currentPrice
    const { error } = await supabase.from('holdings').update(row).eq('id', id)
    if (error) throw error
  },

  remove: async (id: number): Promise<void> => {
    const { error } = await supabase.from('holdings').delete().eq('id', id)
    if (error) throw error
  },

  /**
   * Recalculates quantity and avg_cost for a holding based on all linked transactions.
   * - Income transactions (buy): add units, compute weighted avg cost
   * - Expense transactions (sell): subtract units
   */
  recalculate: async (holdingId: number): Promise<void> => {
    const { data } = await supabase
      .from('transactions')
      .select('amount, units, type')
      .eq('holding_id', holdingId)
    if (!data || data.length === 0) return

    let totalUnits = 0
    let totalCostCents = 0

    for (const tx of data as { amount: number; units: number | null; type: string }[]) {
      const units = Number(tx.units ?? 0)
      if (units <= 0) continue
      if (tx.type === 'income') {
        const pricePerUnit = Math.abs(tx.amount) / units
        totalCostCents += pricePerUnit * units
        totalUnits += units
      } else if (tx.type === 'expense') {
        totalUnits -= units
      }
    }

    const newQty  = Math.max(0, totalUnits)
    const avgCost = totalUnits > 0 ? Math.round(totalCostCents / totalUnits) : 0

    await supabase
      .from('holdings')
      .update({ quantity: newQty, avg_cost: avgCost })
      .eq('id', holdingId)
  },
}
