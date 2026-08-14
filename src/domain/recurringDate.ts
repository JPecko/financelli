import { addWeeks, addMonths, addYears, parseISO, formatISO } from 'date-fns'
import type { RecurringFrequency } from './types'

export type DateRuleMode = 'exact' | 'firstBusinessDay'

const iso = (d: Date) => formatISO(d, { representation: 'date' })
const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6

export function nextBusinessDay(d: Date): Date {
  const r = new Date(d)
  while (isWeekend(r)) r.setDate(r.getDate() + 1)
  return r
}

function firstBusinessDayOfMonth(d: Date): Date {
  return nextBusinessDay(new Date(d.getFullYear(), d.getMonth(), 1))
}

/** Applies the rule's date policy to a raw (unadjusted) occurrence date. */
export function applyDateRule(raw: Date, mode: DateRuleMode, adjustToBusinessDay: boolean): Date {
  if (mode === 'firstBusinessDay') return firstBusinessDayOfMonth(raw)
  return adjustToBusinessDay ? nextBusinessDay(raw) : raw
}

function stepAnchor(anchor: Date, frequency: RecurringFrequency): Date {
  switch (frequency) {
    case 'weekly':  return addWeeks(anchor, 1)
    case 'monthly': return addMonths(anchor, 1)
    case 'yearly':  return addYears(anchor, 1)
  }
}

type Occurrence = { anchorDate: string; nextDue: string }

/**
 * The rule's "anchor" is a raw, never-adjusted date used purely for stepping (avoids drift —
 * e.g. an exact day-of-month adjusted to the next Monday must still step from the original day
 * next period, not from the adjusted one). `nextDue` is the actual date the rule fires on,
 * derived from the anchor by applying the date policy.
 */
export function resolveInitialOccurrence(startDateIso: string, mode: DateRuleMode, adjustToBusinessDay: boolean): Occurrence {
  const anchor = parseISO(startDateIso)
  return { anchorDate: iso(anchor), nextDue: iso(applyDateRule(anchor, mode, adjustToBusinessDay)) }
}

/** Advances the anchor by one period and returns the new anchor/nextDue pair. */
export function advanceOccurrence(anchorIso: string, frequency: RecurringFrequency, mode: DateRuleMode, adjustToBusinessDay: boolean): Occurrence {
  const nextAnchor = stepAnchor(parseISO(anchorIso), frequency)
  return { anchorDate: iso(nextAnchor), nextDue: iso(applyDateRule(nextAnchor, mode, adjustToBusinessDay)) }
}
