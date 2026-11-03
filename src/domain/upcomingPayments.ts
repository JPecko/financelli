import { ruleOccurrencesBetween } from './recurringOccurrences'
import type { Account, RecurringRule } from './types'

export interface UpcomingPayment {
  key:          string
  date:         string
  name:         string
  category:     string
  type:         RecurringRule['type']
  accountId:    number
  toAccountId?: number
  amount:       number  // signed effect on accountId (cents); a transfer adds -amount to toAccountId
}

// Group rules only touch a bank account when the user pays and a linked transaction is created
function bankAmount(rule: RecurringRule): number | null {
  if (rule.groupId == null) return rule.amount
  if (rule.payerMemberId != null || rule.createTx === false) return null
  return -Math.abs(rule.amount)
}

/** Every firing of the active rules between `fromIso` and `toIso`, in date order. */
export function buildUpcomingPayments(rules: RecurringRule[], fromIso: string, toIso: string): UpcomingPayment[] {
  const items: UpcomingPayment[] = []
  for (const rule of rules) {
    const amount = bankAmount(rule)
    if (amount == null || amount === 0 || rule.id == null) continue
    for (const date of ruleOccurrencesBetween(rule, fromIso, toIso)) {
      items.push({
        key:         `${rule.id}-${date}`,
        date,
        name:        rule.name || rule.description,
        category:    rule.category,
        type:        rule.type,
        accountId:   rule.accountId,
        toAccountId: rule.groupId == null ? rule.toAccountId : undefined,
        amount,
      })
    }
  }
  return items.sort((a, b) => a.date.localeCompare(b.date) || a.amount - b.amount)
}

export interface BalanceAlert {
  accountId: number
  date:      string  // day the balance reaches its lowest point
  lowest:    number  // lowest projected balance (cents, negative)
}

// Credit cards and investments are expected to sit below zero / fluctuate, so they never alert
const ALERT_TYPES = new Set<Account['type']>(['checking', 'savings', 'cash', 'meal'])

/** Accounts whose balance would drop below zero at some point while the upcoming payments go through. */
export function findBalanceAlerts(
  items: UpcomingPayment[], accounts: Account[], balances: Record<number, number>,
): BalanceAlert[] {
  const running: Record<number, number> = { ...balances }
  const lowest: Record<number, { date: string; value: number }> = {}
  const apply = (accountId: number, delta: number, date: string) => {
    running[accountId] = (running[accountId] ?? 0) + delta
    if (running[accountId] < (lowest[accountId]?.value ?? 0)) lowest[accountId] = { date, value: running[accountId] }
  }
  for (const item of items) {
    apply(item.accountId, item.amount, item.date)
    if (item.toAccountId != null) apply(item.toAccountId, -item.amount, item.date)
  }
  return accounts
    .filter(a => a.id != null && ALERT_TYPES.has(a.type) && lowest[a.id] != null)
    .map(a => ({ accountId: a.id!, date: lowest[a.id!].date, lowest: lowest[a.id!].value }))
}
