import { addMonths, addWeeks, addYears, differenceInCalendarDays, format, parseISO } from 'date-fns'
import type { RecurringFrequency, RecurringRule, Transaction } from './types'

// How far back expenses are scanned (13 months so a yearly charge shows up twice)
export const DETECTION_LOOKBACK_MONTHS = 13

type Cadence = { frequency: Exclude<RecurringFrequency, 'once'>; minDays: number; maxDays: number; minCount: number; perMonth: number }

const CADENCES: Cadence[] = [
  { frequency: 'weekly',  minDays: 6,   maxDays: 8,   minCount: 4, perMonth: 52 / 12 },
  { frequency: 'monthly', minDays: 26,  maxDays: 35,  minCount: 3, perMonth: 1 },
  { frequency: 'yearly',  minDays: 340, maxDays: 390, minCount: 2, perMonth: 1 / 12 },
]

// Share of gaps that must match the cadence, and how far an amount may drift from the median
const MIN_REGULAR_SHARE = 0.7
const AMOUNT_TOLERANCE  = 0.15
// A subscription that missed more than this many cycles is considered cancelled
const MAX_MISSED_CYCLES = 1.5

const SKIPPED_CATEGORIES = new Set(['investing', 'invest-move', 'capital', 'roundup', 'cashback', 'transfer'])

export type SubscriptionCandidate = {
  key:          string   // stable id used to dismiss a suggestion
  accountId:    number
  description:  string   // latest description without reference tokens
  category:     string
  frequency:    Cadence['frequency']
  amount:       number   // cents, negative (median of the charges)
  amountVaries: boolean  // charges differ by more than a few percent (usage-based or price changes)
  occurrences:  number
  lastDate:     string
  nextDate:     string   // expected next charge, used as the rule's start date
  monthlyCost:  number   // cents, positive, normalised to a month
}

/** Lowercase, no digits/punctuation: "NETFLIX.COM 12/03 #4471" and "Netflix.com 14/04" share a key. */
export function normalizeDescription(description: string) {
  return description.toLowerCase().replace(/[0-9]+/g, ' ').replace(/[^\p{L}]+/gu, ' ').trim().replace(/\s+/g, ' ')
}

// Display name without reference tokens: "NETFLIX.COM 12/03 #4471" → "NETFLIX.COM"
export function cleanDescription(description: string) {
  const kept = description.split(/\s+/).filter(token => !/\d/.test(token)).join(' ').trim()
  return kept || description.trim()
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function isCandidateExpense(tx: Transaction) {
  return tx.type === 'expense' && tx.amount < 0 && tx.recurringRuleId == null && !SKIPPED_CATEGORIES.has(tx.category)
}

function detectCadence(dates: string[]): Cadence | null {
  const gaps = dates.slice(1).map((d, i) => differenceInCalendarDays(parseISO(d), parseISO(dates[i])))
  if (gaps.length === 0) return null
  const typical = median(gaps)
  const cadence = CADENCES.find(c => typical >= c.minDays && typical <= c.maxDays)
  if (!cadence || dates.length < cadence.minCount) return null
  const regular = gaps.filter(g => g >= cadence.minDays && g <= cadence.maxDays).length
  return regular / gaps.length >= MIN_REGULAR_SHARE ? cadence : null
}

function buildCandidate(key: string, txs: Transaction[], today: Date): SubscriptionCandidate | null {
  // Several charges on the same day (e.g. split payments) count once
  const byDate = new Map<string, Transaction>()
  for (const tx of txs) if (!byDate.has(tx.date)) byDate.set(tx.date, tx)
  const charges = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))

  const cadence = detectCadence(charges.map(c => c.date))
  if (!cadence) return null

  const amounts = charges.map(c => -c.amount)
  const typical = median(amounts)
  if (amounts.some(a => Math.abs(a - typical) > typical * AMOUNT_TOLERANCE)) return null

  const last     = charges[charges.length - 1]
  const interval = median(charges.slice(1).map((c, i) => differenceInCalendarDays(parseISO(c.date), parseISO(charges[i].date))))
  if (differenceInCalendarDays(today, parseISO(last.date)) > interval * MAX_MISSED_CYCLES) return null

  // Calendar steps from the last charge keep the day of month (Netflix on the 12th stays on the 12th)
  const step = { weekly: addWeeks, monthly: addMonths, yearly: addYears }[cadence.frequency]
  let next = step(parseISO(last.date), 1)
  while (format(next, 'yyyy-MM-dd') < format(today, 'yyyy-MM-dd')) next = step(next, 1)

  return {
    key,
    accountId:    last.accountId,
    description:  cleanDescription(last.description),
    category:     last.category,
    frequency:    cadence.frequency,
    amount:       -Math.round(typical),
    amountVaries: amounts.some(a => Math.abs(a - typical) > typical * 0.03),
    occurrences:  charges.length,
    lastDate:     last.date,
    nextDate:     format(next, 'yyyy-MM-dd'),
    monthlyCost:  Math.round(typical * cadence.perMonth),
  }
}

// An active rule on the same account with a matching name or a close amount already covers the charge
function coveredByRule(c: SubscriptionCandidate, rules: RecurringRule[]) {
  const desc = normalizeDescription(c.description)
  return rules.some(r => {
    if (!r.active || r.accountId !== c.accountId || r.type !== 'expense') return false
    const names = [r.name, r.description].map(normalizeDescription).filter(Boolean)
    const sameName = names.some(n => n === desc || n.includes(desc) || desc.includes(n))
    const sameAmount = Math.abs(Math.abs(r.amount) - Math.abs(c.amount)) <= Math.abs(c.amount) * AMOUNT_TOLERANCE && r.category === c.category
    return sameName || (sameAmount && r.frequency === c.frequency)
  })
}

/** Repeating expenses (same account + description, steady cadence and amount) not yet covered by a rule. */
export function detectSubscriptions(
  transactions: Transaction[],
  rules: RecurringRule[],
  dismissed: Set<string>,
  today = new Date(),
): SubscriptionCandidate[] {
  const groups = new Map<string, Transaction[]>()
  for (const tx of transactions) {
    if (!isCandidateExpense(tx)) continue
    const norm = normalizeDescription(tx.description)
    if (!norm) continue
    const key = `${tx.accountId}|${norm}`
    groups.set(key, [...(groups.get(key) ?? []), tx])
  }

  const candidates: SubscriptionCandidate[] = []
  for (const [key, txs] of groups) {
    if (dismissed.has(key)) continue
    const candidate = buildCandidate(key, txs, today)
    if (candidate && !coveredByRule(candidate, rules)) candidates.push(candidate)
  }
  return candidates.sort((a, b) => b.monthlyCost - a.monthlyCost)
}
