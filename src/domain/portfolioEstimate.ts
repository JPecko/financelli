import type { Account, Asset, AssetPrice, Holding, PurchaseHistory } from './types'

export type PortfolioEstimateInputs = {
  purchases: PurchaseHistory[]   // all investment accounts, any order
  holdings:  Holding[]
  prices:    AssetPrice[]        // historical prices, any order
  assetMap:  Record<number, Asset>
}

type Indexed = {
  purchasesByAccount: Map<number, PurchaseHistory[]>
  holdingsByAccount:  Map<number, Holding[]>
  pricesByAsset:      Map<number, AssetPrice[]>
  buysByAsset:        Map<number, PurchaseHistory[]>
  assetMap:           Record<number, Asset>
}

function groupSorted<T>(items: T[], key: (i: T) => number, date: (i: T) => string) {
  const map = new Map<number, T[]>()
  for (const i of items) {
    if (!map.has(key(i))) map.set(key(i), [])
    map.get(key(i))!.push(i)
  }
  for (const list of map.values()) list.sort((a, b) => date(a).localeCompare(date(b)))
  return map
}

function lastOnOrBefore<T>(list: T[] | undefined, endDate: string, date: (i: T) => string): T | undefined {
  if (!list) return undefined
  for (let i = list.length - 1; i >= 0; i--) if (date(list[i]) <= endDate) return list[i]
  return undefined
}

export function indexPortfolioInputs({ purchases, holdings, prices, assetMap }: PortfolioEstimateInputs): Indexed {
  return {
    purchasesByAccount: groupSorted(purchases, p => p.accountId, p => p.date),
    holdingsByAccount:  groupSorted(holdings, h => h.accountId, h => h.date ?? ''),
    pricesByAsset:      groupSorted(prices, p => p.assetId, p => p.date),
    buysByAsset:        groupSorted(purchases.filter(p => p.quantity > 0), p => p.assetId, p => p.date),
    assetMap,
  }
}

// Recorded price for that date → else latest purchase price up to then → else the given fallback
function unitPriceAt(idx: Indexed, assetId: number, endDate: string, fallback: number) {
  return lastOnOrBefore(idx.pricesByAsset.get(assetId), endDate, p => p.date)?.price
    ?? lastOnOrBefore(idx.buysByAsset.get(assetId), endDate, p => p.date)?.priceCents
    ?? fallback
}

/** Estimated market value (cents) of an investment account at `endDate`; null when there's nothing to estimate from. */
export function estimateAccountValueAt(idx: Indexed, account: Account, endDate: string): number | null {
  const purchases = idx.purchasesByAccount.get(account.id!)
  if (purchases && purchases.length > 0) {
    const qtyByAsset = new Map<number, number>()
    for (const p of purchases) {
      if (p.date > endDate) break
      qtyByAsset.set(p.assetId, (qtyByAsset.get(p.assetId) ?? 0) + p.quantity)
    }
    let value = 0
    for (const [assetId, qty] of qtyByAsset) {
      if (qty <= 0) continue
      value += qty * unitPriceAt(idx, assetId, endDate, idx.assetMap[assetId]?.currentPrice ?? 0)
    }
    return Math.round(value)
  }

  // Manually added holdings: undated ones are assumed held since the account was created
  const holdings = idx.holdingsByAccount.get(account.id!)
  if (!holdings || holdings.length === 0) return null
  const accountStart = account.createdAt.slice(0, 10)
  return Math.round(holdings
    .filter(h => (h.date ?? accountStart) <= endDate)
    .reduce((sum, h) => sum + h.quantity * unitPriceAt(idx, h.assetId, endDate, h.avgCost), 0))
}
