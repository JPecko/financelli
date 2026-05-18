import { supabase } from '@/data/supabase'
import type { Asset } from '@/domain/types'

type AssetRow = {
  id: number
  user_id: string
  name: string
  label: string | null
  ticker: string | null
  isin: string | null
  current_price: number
  created_at: string
}

function toAsset(row: AssetRow): Asset {
  return {
    id:           row.id,
    name:         row.name,
    label:        row.label ?? undefined,
    ticker:       row.ticker ?? undefined,
    isin:         row.isin ?? undefined,
    currentPrice: row.current_price,
    createdAt:    row.created_at,
  }
}

export const assetsRepo = {
  getAll: async (): Promise<Asset[]> => {
    const { data, error } = await supabase.from('assets').select('*').order('name')
    if (error) throw error
    return (data as AssetRow[]).map(toAsset)
  },

  add: async (asset: Omit<Asset, 'id' | 'createdAt'>): Promise<Asset> => {
    const { data, error } = await supabase
      .from('assets')
      .insert({
        name:          asset.name,
        label:         asset.label ?? null,
        ticker:        asset.ticker ?? null,
        isin:          asset.isin ?? null,
        current_price: asset.currentPrice,
      })
      .select()
      .single()
    if (error) throw error
    return toAsset(data as AssetRow)
  },

  update: async (id: number, changes: Partial<Asset>): Promise<void> => {
    const row: Record<string, unknown> = {}
    if (changes.name         !== undefined) row.name          = changes.name
    if (changes.label        !== undefined) row.label         = changes.label ?? null
    if (changes.ticker       !== undefined) row.ticker        = changes.ticker ?? null
    if (changes.isin         !== undefined) row.isin          = changes.isin ?? null
    if (changes.currentPrice !== undefined) row.current_price = changes.currentPrice
    const { error } = await supabase.from('assets').update(row).eq('id', id)
    if (error) throw error
  },

  remove: async (id: number): Promise<void> => {
    const { error } = await supabase.from('assets').delete().eq('id', id)
    if (error) throw error
  },
}
