import { format, addMonths, startOfMonth, parseISO } from 'date-fns'
import { fromCents } from '@/domain/money'
import type { Asset, AssetPrice, PurchaseHistory } from '@/domain/types'

export type HistoryChartPoint = {
  label:    string   // "Jan '24"
  monthKey: string   // "2024-01" — for sorting / tooltip
  invested: number   // EUR
  value:    number   // EUR
}

// Returns the most recent price on or before `dateStr`, falling back to `fallback`
function priceAt(prices: AssetPrice[], dateStr: string, fallback: number): number {
  for (let i = prices.length - 1; i >= 0; i--) {
    if (prices[i].date <= dateStr) return prices[i].price
  }
  return fallback
}

export function buildHistoryChartData(
  purchases: PurchaseHistory[],
  assetMap: Record<number, Asset>,
  allPrices: AssetPrice[],   // all prices for assets in this account, sorted asc by date
): HistoryChartPoint[] {
  if (purchases.length === 0) return []

  const sorted = [...purchases].sort((a, b) => a.date.localeCompare(b.date))
  const firstDate = parseISO(sorted[0].date)
  const today     = new Date()

  // Build month range
  const months: string[] = []
  let cur = startOfMonth(firstDate)
  while (cur <= today) {
    months.push(format(cur, 'yyyy-MM'))
    cur = addMonths(cur, 1)
  }

  // Group prices by assetId, sorted ascending (already sorted from repo)
  const pricesByAsset = new Map<number, AssetPrice[]>()
  for (const p of allPrices) {
    if (!pricesByAsset.has(p.assetId)) pricesByAsset.set(p.assetId, [])
    pricesByAsset.get(p.assetId)!.push(p)
  }

  return months.map(monthKey => {
    const endOfMonth = `${monthKey}-31`   // safe upper bound — string comparison works

    // Cumulative invested and qty per asset up to end of this month
    let invested = 0
    const qtyByAsset = new Map<number, number>()

    for (const p of sorted) {
      if (p.date > endOfMonth) break
      const prev = qtyByAsset.get(p.assetId) ?? 0
      qtyByAsset.set(p.assetId, prev + p.quantity)
      if (p.quantity > 0) {
        invested += fromCents(p.priceCents) * p.quantity
      }
    }

    // Market value: sum(qty × price at this month) per asset
    let value = 0
    for (const [assetId, qty] of qtyByAsset.entries()) {
      if (qty <= 0) continue
      const asset    = assetMap[assetId]
      const prices   = pricesByAsset.get(assetId) ?? []
      const priceCents = priceAt(prices, endOfMonth, asset?.currentPrice ?? 0)
      value += fromCents(priceCents) * qty
    }

    const date  = parseISO(`${monthKey}-01`)
    const label = format(date, "MMM ''yy")

    return { label, monthKey, invested: Math.round(invested * 100) / 100, value: Math.round(value * 100) / 100 }
  })
}
