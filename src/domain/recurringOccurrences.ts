import { advanceOccurrence } from './recurringDate'
import type { RecurringRule } from './types'

// Upper bound per call: a weekly rule fires ~5 times a month, ~53 times a year
const MAX_STEPS = 60

/** Dates (ISO) on which an active rule will fire between `fromIso` and `toIso`, inclusive. */
export function ruleOccurrencesBetween(rule: RecurringRule, fromIso: string, toIso: string): string[] {
  if (!rule.active) return []
  const dates: string[] = []
  let anchor = rule.anchorDate ?? rule.nextDue
  let due    = rule.nextDue
  for (let i = 0; i < MAX_STEPS && due <= toIso && (!rule.endDate || due <= rule.endDate); i++) {
    if (due >= fromIso) dates.push(due)
    if (rule.frequency === 'once') break
    const next = advanceOccurrence(anchor, rule.frequency, rule.dateRule ?? 'exact', rule.adjustToBusinessDay ?? false)
    anchor = next.anchorDate
    due    = next.nextDue
  }
  return dates
}
