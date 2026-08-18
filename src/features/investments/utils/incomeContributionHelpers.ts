import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns'
import { fromCents } from '@/domain/money'
import type { PurchaseHistory, Transaction } from '@/domain/types'

const AMOUNT_TOLERANCE_CENTS = 100   // 1€ slack for rounding/fees
const DATE_WINDOW_DAYS       = 14    // broker settlement / dividend reinvestment can lag the income date by up to ~2 weeks

// Income transactions tagged as an investment move — money credited into this account via income, not a plain deposit/transfer
export function filterIncomeContributions(transactions: Transaction[], accountId: number): Transaction[] {
  return transactions.filter(tx => tx.accountId === accountId && tx.type === 'income' && tx.category === 'invest-move')
}

// Dates closest to `dateStr` first, so an exact-day match always wins over a nearby one
function datesAround(dateStr: string, windowDays: number): string[] {
  const base = parseISO(dateStr)
  const dates = [dateStr]
  for (let d = 1; d <= windowDays; d++) {
    dates.push(format(addDays(base, d), 'yyyy-MM-dd'))
    dates.push(format(addDays(base, -d), 'yyyy-MM-dd'))
  }
  return dates
}

// A day can hold unrelated purchases (e.g. a fixed recurring buy alongside this variable one) — summing
// everything on the day is wrong. Try the smallest subset first (usually a single row); only reach for a
// bigger combo to cover a broker's split/partial-fill rows for the SAME buy.
function findMatchingSubset(dayPurchases: PurchaseHistory[], targetCents: number): PurchaseHistory[] | undefined {
  const n = dayPurchases.length
  for (let size = 1; size <= n; size++) {
    const combo = combinationsOfSize(dayPurchases, size)
    for (const subset of combo) {
      const sum = subset.reduce((s, p) => s + p.priceCents * p.quantity, 0)
      if (Math.abs(sum - targetCents) <= AMOUNT_TOLERANCE_CENTS) return subset
    }
  }
  return undefined
}

function combinationsOfSize<T>(items: T[], size: number): T[][] {
  if (size === 0) return [[]]
  if (items.length < size) return []
  const [first, ...rest] = items
  const withFirst    = combinationsOfSize(rest, size - 1).map(c => [first, ...c])
  const withoutFirst = combinationsOfSize(rest, size)
  return [...withFirst, ...withoutFirst]
}

export interface UnmatchedContribution {
  date:              string
  amountEuros:       number
  nearestDate?:      string   // closest date (any window size) that has any purchase at all, for diagnosis
  nearestTotalEuros?: number
  nearestDaysAway?:  number
}

// No FK between an income contribution and the imported purchase(s) it funded — matched heuristically by
// same-account, nearby date, and total buy cost within a small tolerance of the income amount
export function matchContributionsToPurchases(
  contributions: Transaction[],
  purchases: PurchaseHistory[],
): { matchedPurchases: PurchaseHistory[]; unmatched: UnmatchedContribution[] } {
  const purchasesByDate = new Map<string, PurchaseHistory[]>()
  for (const p of purchases) {
    if (!purchasesByDate.has(p.date)) purchasesByDate.set(p.date, [])
    purchasesByDate.get(p.date)!.push(p)
  }

  const usedIds: Set<number> = new Set()
  const matchedPurchases: PurchaseHistory[] = []
  const unmatched: UnmatchedContribution[] = []

  for (const tx of contributions) {
    const targetCents = Math.abs(tx.amount)
    let found = false

    for (const dateKey of datesAround(tx.date, DATE_WINDOW_DAYS)) {
      const dayPurchases = (purchasesByDate.get(dateKey) ?? []).filter(p => p.id != null && !usedIds.has(p.id))
      if (dayPurchases.length === 0) continue

      const subset = findMatchingSubset(dayPurchases, targetCents)
      if (subset) {
        subset.forEach(p => usedIds.add(p.id!))
        matchedPurchases.push(...subset)
        found = true
        break
      }
    }

    if (!found) {
      // Diagnostic only: closest date (any distance) with any purchase, to tell a "close but no cigar" miss from "nothing at all"
      let nearest: PurchaseHistory | undefined
      let nearestDays = Infinity
      for (const p of purchases) {
        const days = Math.abs(differenceInCalendarDays(parseISO(p.date), parseISO(tx.date)))
        if (days < nearestDays) { nearestDays = days; nearest = p }
      }
      const nearestDayTotal = nearest
        ? (purchasesByDate.get(nearest.date) ?? []).reduce((sum, p) => sum + p.priceCents * p.quantity, 0)
        : undefined

      unmatched.push({
        date:              tx.date,
        amountEuros:       fromCents(targetCents),
        nearestDate:       nearest?.date,
        nearestTotalEuros: nearestDayTotal != null ? fromCents(nearestDayTotal) : undefined,
        nearestDaysAway:   nearest ? nearestDays : undefined,
      })
    }
  }

  return { matchedPurchases, unmatched }
}
