import { differenceInCalendarMonths, parseISO } from 'date-fns'

// Total invested / calendar months from the first holding to now (inclusive) — pre-fills the contribution input
export function computeDefaultMonthlyContribution(investedCents: number, firstDate?: string): number {
  if (investedCents <= 0 || !firstDate) return 0
  const months = Math.max(1, differenceInCalendarMonths(new Date(), parseISO(firstDate)) + 1)
  return Math.round((investedCents / 100 / months) * 100) / 100
}

export interface ForecastPoint {
  year: number
  nominal: number   // euros — raw portfolio value
  real: number      // euros — deflated to today's purchasing power
  invested: number  // euros — total capital put in
}

function fvContribs(pmt: number, monthlyRate: number, months: number): number {
  if (monthlyRate === 0) return pmt * months
  return pmt * (Math.pow(1 + monthlyRate, months) - 1) / monthlyRate
}

export function buildForecastData(
  currentValueCents: number,
  annualReturnPct: number,
  annualInflationPct: number,
  monthlyContribEuros: number,
  horizonYears: number,
): ForecastPoint[] {
  const pv  = currentValueCents / 100
  const r   = annualReturnPct / 100
  const inf = annualInflationPct / 100
  const pmt = monthlyContribEuros
  const mr  = Math.pow(1 + r, 1 / 12) - 1   // monthly nominal rate

  const round2 = (n: number) => Math.round(n * 100) / 100

  const points: ForecastPoint[] = [{ year: 0, nominal: pv, real: pv, invested: pv }]

  for (let y = 1; y <= horizonYears; y++) {
    const n       = y * 12
    const nominal = pv * Math.pow(1 + r, y) + fvContribs(pmt, mr, n)
    const real    = nominal / Math.pow(1 + inf, y)
    const invested = pv + pmt * n

    points.push({
      year:     y,
      nominal:  round2(nominal),
      real:     round2(real),
      invested: round2(invested),
    })
  }

  return points
}
