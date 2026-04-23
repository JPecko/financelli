import { supabase } from '@/data/supabase'
import type { Holding } from '@/domain/types'

type HoldingRow = {
  id: number
  user_id: string
  account_id: number
  asset_id: number
  quantity: number
  avg_cost: number
  date: string | null
  created_at: string
}

function toHolding(row: HoldingRow): Holding {
  return {
    id:        row.id,
    accountId: row.account_id,
    assetId:   row.asset_id,
    quantity:  Number(row.quantity),
    avgCost:   row.avg_cost,
    date:      row.date ?? undefined,
    createdAt: row.created_at,
  }
}

export const holdingsRepo = {
  getAll: async (): Promise<Holding[]> => {
    const { data, error } = await supabase
      .from('holdings')
      .select('*')
      .order('asset_id')
    if (error) throw error
    return (data as HoldingRow[]).map(toHolding)
  },

  getByAccount: async (accountId: number): Promise<Holding[]> => {
    const { data, error } = await supabase
      .from('holdings')
      .select('*')
      .eq('account_id', accountId)
      .order('asset_id')
    if (error) throw error
    return (data as HoldingRow[]).map(toHolding)
  },

  add: async (holding: Omit<Holding, 'id' | 'createdAt'>): Promise<Holding> => {
    const { data, error } = await supabase
      .from('holdings')
      .insert({
        account_id: holding.accountId,
        asset_id:   holding.assetId,
        quantity:   holding.quantity,
        avg_cost:   holding.avgCost,
        date:       holding.date ?? null,
      })
      .select()
      .single()
    if (error) throw error
    return toHolding(data as HoldingRow)
  },

  update: async (id: number, changes: Partial<Holding>): Promise<void> => {
    const row: Record<string, unknown> = {}
    if (changes.assetId  !== undefined) row.asset_id = changes.assetId
    if (changes.quantity !== undefined) row.quantity  = changes.quantity
    if (changes.avgCost  !== undefined) row.avg_cost  = changes.avgCost
    if (changes.date     !== undefined) row.date      = changes.date ?? null
    const { error } = await supabase.from('holdings').update(row).eq('id', id)
    if (error) throw error
  },

  remove: async (id: number): Promise<void> => {
    const { error } = await supabase.from('holdings').delete().eq('id', id)
    if (error) throw error
  },

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
