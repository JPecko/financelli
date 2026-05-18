import { supabase } from '@/data/supabase'
import type { PurchaseHistory } from '@/domain/types'

type PurchaseHistoryRow = {
  id:          number
  user_id:     string
  account_id:  number
  asset_id:    number
  date:        string
  quantity:    number
  price_cents: number
  created_at:  string
}

function toPurchaseHistory(row: PurchaseHistoryRow): PurchaseHistory {
  return {
    id:         row.id,
    accountId:  row.account_id,
    assetId:    row.asset_id,
    date:       row.date,
    quantity:   Number(row.quantity),
    priceCents: row.price_cents,
    createdAt:  row.created_at,
  }
}

export const purchaseHistoryRepo = {
  getByAccount: async (accountId: number): Promise<PurchaseHistory[]> => {
    const { data, error } = await supabase
      .from('purchase_history')
      .select('*')
      .eq('account_id', accountId)
      .order('date', { ascending: true })
    if (error) throw error
    return (data as PurchaseHistoryRow[]).map(toPurchaseHistory)
  },

  addMany: async (items: Omit<PurchaseHistory, 'id' | 'createdAt'>[]): Promise<void> => {
    if (items.length === 0) return
    const rows = items.map(i => ({
      account_id:  i.accountId,
      asset_id:    i.assetId,
      date:        i.date,
      quantity:    i.quantity,
      price_cents: i.priceCents,
    }))
    const { error } = await supabase.from('purchase_history').insert(rows)
    if (error) throw error
  },

  clearByAccountAndAsset: async (accountId: number, assetId: number): Promise<void> => {
    const { error } = await supabase
      .from('purchase_history')
      .delete()
      .eq('account_id', accountId)
      .eq('asset_id', assetId)
    if (error) throw error
  },

  clearByAccount: async (accountId: number): Promise<void> => {
    const { error } = await supabase
      .from('purchase_history')
      .delete()
      .eq('account_id', accountId)
    if (error) throw error
  },

  clearByAsset: async (assetId: number): Promise<void> => {
    const { error } = await supabase
      .from('purchase_history')
      .delete()
      .eq('asset_id', assetId)
    if (error) throw error
  },
}
