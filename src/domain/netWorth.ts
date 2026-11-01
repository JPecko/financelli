import { endOfMonth, format } from 'date-fns'
import type { Account, AccountType, InvestmentSnapshot } from './types'

export type BalanceDelta = { accountId: number; toAccountId: number | null; amount: number; date: string }

export type YearMonth = { year: number; month: number }

export type NetWorthMonth = YearMonth & {
  balances: Record<number, number>
  total: number
  missingInvestments:   boolean   // an investment account had neither a snapshot nor an estimate
  estimatedInvestments: boolean   // at least one investment value was estimated from purchase/price history
}

export type InvestmentEstimator = (account: Account, endDate: string) => number | null

export function monthEndDate({ year, month }: YearMonth): string {
  return format(endOfMonth(new Date(year, month - 1, 1)), 'yyyy-MM-dd')
}

export function shiftMonth({ year, month }: YearMonth, delta: number): YearMonth {
  const d = new Date(year, month - 1 + delta, 1)
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

export function snapshotKey(accountId: number, snapshotDate: string) {
  return `${accountId}|${snapshotDate}`
}

export function indexSnapshots(snapshots: InvestmentSnapshot[]): Map<string, number> {
  return new Map(snapshots.map(s => [snapshotKey(s.accountId, s.snapshotDate), s.valueCents]))
}

// Cash balance at month-end = current balance minus every effect dated after that month (both transfer legs)
function laterEffects(deltas: BalanceDelta[], afterDate: string): Record<number, number> {
  const map: Record<number, number> = {}
  for (const d of deltas) {
    if (d.date <= afterDate) continue
    map[d.accountId] = (map[d.accountId] ?? 0) + d.amount
    if (d.toAccountId != null) map[d.toAccountId] = (map[d.toAccountId] ?? 0) - d.amount
  }
  return map
}

/** Net worth at a past month-end: cash from transactions, investments from snapshots (else estimated). */
export function buildNetWorthMonth(
  ym: YearMonth,
  accounts: Account[],
  deltas: BalanceDelta[],
  snapshots: Map<string, number>,
  estimate?: InvestmentEstimator,
): NetWorthMonth {
  const endDate  = monthEndDate(ym)
  const later    = laterEffects(deltas, endDate)
  const balances: Record<number, number> = {}
  let missingInvestments = false
  let estimatedInvestments = false
  for (const a of accounts) {
    if (a.id == null) continue
    if (a.type !== 'investment') {
      balances[a.id] = a.balance - (later[a.id] ?? 0)
      continue
    }
    const snapshot = snapshots.get(snapshotKey(a.id, endDate))
    const value    = snapshot ?? estimate?.(a, endDate) ?? null
    if (value == null) { missingInvestments = true; continue }
    if (snapshot == null) estimatedInvestments = true
    balances[a.id] = value
  }
  return { ...ym, balances, total: sumBalances(balances), missingInvestments, estimatedInvestments }
}

export function sumBalances(balances: Record<number, number>) {
  return Object.values(balances).reduce((s, v) => s + v, 0)
}

export function groupBalancesByType(accounts: Account[], balances: Record<number, number>): [AccountType, number][] {
  const map: Partial<Record<AccountType, number>> = {}
  for (const a of accounts) {
    if (a.id == null || balances[a.id] == null) continue
    map[a.type] = (map[a.type] ?? 0) + balances[a.id]
  }
  return (Object.entries(map) as [AccountType, number][])
    .filter(([, v]) => v !== 0)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
}
