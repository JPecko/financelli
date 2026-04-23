import { useQuery } from '@tanstack/react-query'
import { queryClient } from '@/app/queryClient'
import { queryKeys } from '@/data/queryKeys'
import { assetPricesRepo } from '@/data/repositories/assetPricesRepo'

export function useAssetPrices(assetId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.assetPrices.byAsset(assetId!),
    queryFn:  () => assetPricesRepo.getByAsset(assetId!),
    enabled:  assetId != null,
  })
}

export async function upsertAssetPrice(assetId: number, price: number, date: string) {
  await assetPricesRepo.upsert(assetId, price, date)
  queryClient.invalidateQueries({ queryKey: queryKeys.assetPrices.byAsset(assetId) })
}
