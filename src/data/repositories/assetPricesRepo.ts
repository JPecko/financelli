import { supabase } from '@/data/supabase'
import type { AssetPrice } from '@/domain/types'

type AssetPriceRow = {
  id: number
  asset_id: number
  user_id: string
  price: number
  date: string
  created_at: string
}

function toAssetPrice(row: AssetPriceRow): AssetPrice {
  return {
    id:        row.id,
    assetId:   row.asset_id,
    price:     row.price,
    date:      row.date,
    createdAt: row.created_at,
  }
}

export const assetPricesRepo = {
  getByAsset: async (assetId: number): Promise<AssetPrice[]> => {
    const { data, error } = await supabase
      .from('asset_prices')
      .select('*')
      .eq('asset_id', assetId)
      .order('date', { ascending: false })
    if (error) throw error
    return (data as AssetPriceRow[]).map(toAssetPrice)
  },

  // One price per asset per date — upsert on (asset_id, date) unique constraint
  upsert: async (assetId: number, price: number, date: string): Promise<void> => {
    const { error } = await supabase
      .from('asset_prices')
      .upsert({ asset_id: assetId, price, date }, { onConflict: 'asset_id,date' })
    if (error) throw error
  },
}
