import { format } from 'date-fns'
import { updateAsset } from '@/shared/hooks/useAssets'
import { upsertAssetPrice } from '@/shared/hooks/useAssetPrices'
import { fetchPricesCents } from '@/data/services/priceService'
import type { Asset } from '@/domain/types'

export const PRICE_SYNC_KEY = 'lastPriceSync'
export const PRICE_SYNC_COOLDOWN_MS = 60 * 60 * 1000

export async function syncAssets(assets: Asset[]): Promise<void> {
  const syncable = assets.filter(a => a.ticker)
  if (syncable.length === 0) return
  const { prices, failed } = await fetchPricesCents(syncable.map(a => a.ticker!))
  const today  = format(new Date(), 'yyyy-MM-dd')
  await Promise.all(syncable.map(async a => {
    const priceCents = prices[a.ticker!.toUpperCase()]
    if (priceCents == null) return
    await updateAsset(a.id!, { currentPrice: priceCents })
    await upsertAssetPrice(a.id!, priceCents, today)
  }))
  if (failed.length > 0) {
    console.warn(`[price sync] Stooq couldn't resolve: ${failed.join(', ')}`)
  }
  localStorage.setItem(PRICE_SYNC_KEY, String(Date.now()))
}
