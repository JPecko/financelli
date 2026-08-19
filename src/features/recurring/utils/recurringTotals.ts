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

export type AccountTotal = { account: Account; incoming: number; outgoing: number }

// Per-account breakdown of money coming in vs going out from active rules.
// Transfers count as outgoing on the source account and incoming on the destination.
export function computeAccountTotals(rules: RecurringRule[], accounts: Account[]): AccountTotal[] {
  const byId = new Map<number, AccountTotal>()
  const bump = (accountId: number, key: 'incoming' | 'outgoing', amount: number) => {
    const account = accounts.find(a => a.id === accountId)
    if (!account) return
    const entry = byId.get(accountId) ?? { account, incoming: 0, outgoing: 0 }
    entry[key] += amount
    byId.set(accountId, entry)
  }

  for (const rule of rules.filter(r => r.active)) {
    if (isTransfer(rule)) {
      bump(rule.accountId, 'outgoing', Math.abs(rule.amount))
      bump(rule.toAccountId!, 'incoming', Math.abs(rule.amount))
    } else if (rule.amount >= 0) {
      bump(rule.accountId, 'incoming', rule.amount)
    } else {
      bump(rule.accountId, 'outgoing', Math.abs(rule.amount))
    }
  }

  return accounts
    .map(a => byId.get(a.id!))
    .filter((entry): entry is AccountTotal => entry != null)
}
