import { differenceInCalendarMonths, parseISO } from 'date-fns'
import type { Account, Holding, PurchaseHistory } from './types'

// Same default the Growth Forecast chart starts with
export const DEFAULT_ANNUAL_RETURN_PCT = 7
// Below this much history the account's own return is too noisy, so the default is used instead
const MIN_RETURN_HISTORY_MONTHS = 12
const MAX_ANNUAL_RETURN_PCT = 15

export type InvestmentGrowth = {
  value:             number   // cents, current market value
  monthlyContrib:    number   // cents, average deposited per month
  annualReturnPct:   number
  returnFromHistory: boolean  // false when the default return was used
}

export function monthlyRate(annualReturnPct: number) {
  return Math.pow(1 + annualReturnPct / 100, 1 / 12) - 1
}

/** Future value of a fixed monthly contribution after `months`, compounding at `rate` per month. */
export function contributionsFutureValue(pmt: number, rate: number, months: number) {
  if (rate === 0) return pmt * months
  return pmt * (Math.pow(1 + rate, months) - 1) / rate
}

/** Value after `months`: today's value compounding plus monthly contributions compounding. */
export function projectInvestment(g: InvestmentGrowth, months: number) {
  const rate = monthlyRate(g.annualReturnPct)
  return g.value * Math.pow(1 + rate, months) + contributionsFutureValue(g.monthlyContrib, rate, months)
}

export function monthsSince(date: string | undefined, today = new Date()) {
  if (!date) return 0
  return Math.max(1, differenceInCalendarMonths(today, parseISO(date)) + 1)
}

/** Total invested + first activity date, preferring purchase history (matches the Portfolio History chart). */
export function investedForAverage(account: Account, purchases: PurchaseHistory[], holdings: Holding[], capitalAmount: number) {
  const buys = purchases.filter(p => p.quantity > 0)
  if (buys.length > 0) {
    const invested  = buys.reduce((s, p) => s + p.priceCents * p.quantity, 0)
    const firstDate = buys.reduce((min, p) => (p.date < min ? p.date : min), buys[0].date)
    return { invested, firstDate }
  }
  const firstHolding = holdings.reduce<string | undefined>((min, h) => (h.date && (!min || h.date < min) ? h.date : min), undefined)
  return { invested: (account.investedBase ?? 0) + capitalAmount, firstDate: firstHolding ?? account.createdAt }
}

// Annualised return from value vs cost; steady deposits sit invested ~half the period, so growth spans months / 2
export function estimateAnnualReturnPct(value: number, cost: number, months: number) {
  if (cost <= 0 || value <= 0 || months < MIN_RETURN_HISTORY_MONTHS) return null
  const pct = (Math.pow(value / cost, 24 / months) - 1) * 100
  return Math.min(Math.max(pct, 0), MAX_ANNUAL_RETURN_PCT)
}
