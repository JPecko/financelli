import { format } from 'date-fns'
import type { Locale } from 'date-fns'
import type { NetWorthMonth } from '@/domain/netWorth'
import type { Account } from '@/domain/types'
import type { MonthlyReportAccount, MonthlyReportNetWorthPoint } from '../pdf/monthlyReport.types'

export function buildReportAccounts(
  accounts: Account[],
  balances: Record<number, number>,
  comparison: Record<number, number> | undefined,
  typeLabel: (a: Account) => string,
): MonthlyReportAccount[] {
  return accounts
    .filter(a => a.id != null && balances[a.id] != null)
    .map(a => {
      const balance         = balances[a.id!]
      const previousBalance = comparison?.[a.id!] ?? null
      return {
        name: a.name,
        type: typeLabel(a),
        balance,
        previousBalance,
        delta: previousBalance == null ? null : balance - previousBalance,
      }
    })
}

export function groupReportAccountsByType(accounts: MonthlyReportAccount[]) {
  const map = accounts.reduce<Record<string, number>>((acc, a) => {
    acc[a.type] = (acc[a.type] ?? 0) + a.balance
    return acc
  }, {})
  return Object.entries(map)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
}

// Drops the first month: it only exists so the oldest shown month has a delta
export function buildNetWorthEvolution(months: NetWorthMonth[], locale: Locale): MonthlyReportNetWorthPoint[] {
  return months.slice(1).map((m, i) => ({
    label:     format(new Date(m.year, m.month - 1, 1), 'MMM yyyy', { locale }),
    value:     m.total,
    delta:     m.total - months[i].total,
    partial:   m.missingInvestments || months[i].missingInvestments,
    estimated: m.estimatedInvestments,
  }))
}
