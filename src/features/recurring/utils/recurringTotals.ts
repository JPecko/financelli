import { format, parseISO, type Locale } from 'date-fns'
import { formatMonthYear } from '@/shared/utils/format'
import type { Account, RecurringRule } from '@/domain/types'

const isTransfer = (r: RecurringRule) => r.type === 'transfer' && r.toAccountId != null

// Net total of active, non-transfer rules — transfers don't affect net income/expense.
export function computeTotal(rules: RecurringRule[]): number {
  return rules
    .filter(r => !isTransfer(r) && r.active)
    .reduce((sum, r) => sum + r.amount, 0)
}

export type MonthGroup = { key: string; label: string; rules: RecurringRule[]; total: number }

// Rules already come sorted by nextDue — group consecutive rules sharing a month.
export function groupRulesByMonth(rules: RecurringRule[], locale: Locale): MonthGroup[] {
  const groups: MonthGroup[] = []
  for (const rule of rules) {
    const key = format(parseISO(rule.nextDue), 'yyyy-MM')
    const last = groups[groups.length - 1]
    if (last?.key === key) last.rules.push(rule)
    else groups.push({ key, label: formatMonthYear(rule.nextDue, locale), rules: [rule], total: 0 })
  }
  for (const group of groups) group.total = computeTotal(group.rules)
  return groups
}

export type CategorySlice = { categoryId: string; amount: number; percent: number }
export type AccountTotal = { account: Account; incoming: number; outgoing: number; categories: CategorySlice[] }

// Per-account breakdown of money coming in vs going out from active rules, plus a category
// distribution (gross amount, regardless of direction) for that account's activity.
// Transfers count as outgoing on the source account and incoming on the destination.
export function computeAccountTotals(rules: RecurringRule[], accounts: Account[]): AccountTotal[] {
  const byId = new Map<number, { incoming: number; outgoing: number; categories: Map<string, number> }>()
  const entryFor = (accountId: number) => {
    let entry = byId.get(accountId)
    if (!entry) { entry = { incoming: 0, outgoing: 0, categories: new Map() }; byId.set(accountId, entry) }
    return entry
  }
  const bumpCategory = (accountId: number, categoryId: string, amount: number) => {
    const categories = entryFor(accountId).categories
    categories.set(categoryId, (categories.get(categoryId) ?? 0) + amount)
  }

  for (const rule of rules.filter(r => r.active)) {
    const amount = Math.abs(rule.amount)
    if (isTransfer(rule)) {
      entryFor(rule.accountId).outgoing += amount
      entryFor(rule.toAccountId!).incoming += amount
      bumpCategory(rule.accountId, rule.category, amount)
      bumpCategory(rule.toAccountId!, rule.category, amount)
    } else {
      entryFor(rule.accountId)[rule.amount >= 0 ? 'incoming' : 'outgoing'] += amount
      bumpCategory(rule.accountId, rule.category, amount)
    }
  }

  return accounts
    .filter(a => byId.has(a.id!))
    .map(account => {
      const { incoming, outgoing, categories } = byId.get(account.id!)!
      const total = [...categories.values()].reduce((sum, v) => sum + v, 0)
      const sliced: CategorySlice[] = [...categories.entries()]
        .map(([categoryId, amount]) => ({ categoryId, amount, percent: total > 0 ? (amount / total) * 100 : 0 }))
        .sort((a, b) => b.amount - a.amount)
      return { account, incoming, outgoing, categories: sliced }
    })
}
