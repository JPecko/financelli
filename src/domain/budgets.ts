import { CATEGORIES } from './categories'
import { advanceOccurrence } from './recurringDate'
import type { Account, Budget, RecurringRule } from './types'

// Investing, roundups and cashback are savings/perks, not spending to cap
const NON_BUDGET = new Set(['investing', 'roundup', 'cashback'])
export const BUDGET_CATEGORIES = CATEGORIES.filter(c =>
  (c.type === 'expense' && !NON_BUDGET.has(c.id)) || c.id === 'other')

export type BudgetStatus = 'ok' | 'warning' | 'over'

export function budgetStatus(spent: number, limit: number): BudgetStatus {
  if (spent > limit) return 'over'
  return spent >= limit * 0.8 ? 'warning' : 'ok'
}

export interface BudgetRowData {
  budget:    Budget
  spent:     number
  projected: number  // spent + recurring expenses still due this month
  pct:       number
  status:    BudgetStatus
}

export function buildBudgetRows(
  budgets: Budget[], spending: Record<string, number>, pending: Record<string, number>,
): BudgetRowData[] {
  return budgets
    .map(budget => {
      const spent = Math.round(spending[budget.category] ?? 0)
      return {
        budget,
        spent,
        projected: spent + Math.round(pending[budget.category] ?? 0),
        pct:       Math.round((spent / budget.amountCents) * 100),
        status:    budgetStatus(spent, budget.amountCents),
      }
    })
    .sort((a, b) => b.pct - a.pct)
}

// Own share of one firing; group rules are skipped since their split depends on group members
function personalRuleAmount(rule: RecurringRule, accounts: Account[]): number {
  if (rule.isReimbursable || rule.groupId != null) return 0
  const participants = accounts.find(a => a.id === rule.accountId)?.participants ?? 1
  const divisor = rule.isPersonal ? 1 : rule.splitN ?? participants
  return Math.abs(rule.amount) / divisor
}

/** Personal amount per category of active expense rules still due between `fromIso` and `toIso` (inclusive). */
export function pendingRecurringByCategory(
  rules: RecurringRule[], accounts: Account[], fromIso: string, toIso: string,
): Record<string, number> {
  const result: Record<string, number> = {}
  for (const rule of rules) {
    if (!rule.active || rule.type !== 'expense' || rule.amount >= 0) continue
    const amount = personalRuleAmount(rule, accounts)
    if (amount === 0) continue
    let anchor = rule.anchorDate ?? rule.nextDue
    let due    = rule.nextDue
    // Bounded loop: weekly rules fire at most ~5 times in a month
    for (let i = 0; i < 6 && due <= toIso && (!rule.endDate || due <= rule.endDate); i++) {
      if (due >= fromIso) result[rule.category] = (result[rule.category] ?? 0) + amount
      if (rule.frequency === 'once') break
      const next = advanceOccurrence(anchor, rule.frequency, rule.dateRule ?? 'exact', rule.adjustToBusinessDay ?? false)
      anchor = next.anchorDate
      due    = next.nextDue
    }
  }
  return result
}
