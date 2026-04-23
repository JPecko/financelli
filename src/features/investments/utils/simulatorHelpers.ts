export interface SimulatorPoint {
  year: number
  invested: number   // euros — total capital contributed
  nominal: number    // euros — portfolio at nominal growth
  real: number       // euros — nominal deflated to today's purchasing power
}

export interface TickerSuggestion {
  ticker: string
  name: string
}

function fvContribs(pmt: number, monthlyRate: number, months: number): number {
  if (monthlyRate === 0) return pmt * months
  return pmt * (Math.pow(1 + monthlyRate, months) - 1) / monthlyRate
}

export function buildSimulatorData(
  initialEuros: number,
  annualReturnPct: number,
  annualInflationPct: number,
  monthlyContribEuros: number,
  horizonYears: number,
): SimulatorPoint[] {
  const pv  = Math.max(0, initialEuros)
  const r   = annualReturnPct / 100
  const inf = annualInflationPct / 100
  const pmt = Math.max(0, monthlyContribEuros)
  const mr  = Math.pow(1 + r, 1 / 12) - 1

  const round2 = (n: number) => Math.round(n * 100) / 100

  const points: SimulatorPoint[] = [{ year: 0, invested: pv, nominal: pv, real: pv }]

  for (let y = 1; y <= horizonYears; y++) {
    const n        = y * 12
    const nominal  = pv * Math.pow(1 + r, y) + fvContribs(pmt, mr, n)
    const real     = nominal / Math.pow(1 + inf, y)
    const invested = pv + pmt * n
    points.push({ year: y, invested: round2(invested), nominal: round2(nominal), real: round2(real) })
  }

  return points
}

// Curated list matching Stooq ticker format (.DE = Xetra, .L = LSE, no suffix = US)
export const POPULAR_TICKERS: TickerSuggestion[] = [
  // Xetra (Germany)
  { ticker: 'SXR8.DE',  name: 'iShares Core S&P 500 UCITS ETF' },
  { ticker: 'VUAA.DE',  name: 'Vanguard S&P 500 UCITS ETF' },
  { ticker: 'VWCE.DE',  name: 'Vanguard FTSE All-World UCITS ETF' },
  { ticker: 'EUNL.DE',  name: 'iShares Core MSCI World UCITS ETF' },
  { ticker: 'IS3N.DE',  name: 'iShares Core MSCI EM IMI UCITS ETF' },
  { ticker: 'IUSQ.DE',  name: 'iShares MSCI ACWI UCITS ETF' },
  { ticker: 'EXS1.DE',  name: 'iShares Core DAX UCITS ETF' },
  { ticker: 'IUSN.DE',  name: 'iShares MSCI World Small Cap UCITS ETF' },
  // LSE (London)
  { ticker: 'VUAA.L',   name: 'Vanguard S&P 500 UCITS ETF (LSE)' },
  { ticker: 'VWRL.L',   name: 'Vanguard FTSE All-World UCITS ETF (LSE)' },
  { ticker: 'SWDA.L',   name: 'iShares Core MSCI World UCITS ETF (LSE)' },
  { ticker: 'CSPX.L',   name: 'iShares Core S&P 500 UCITS ETF (LSE)' },
  { ticker: 'EQQQ.L',   name: 'Invesco NASDAQ-100 UCITS ETF (LSE)' },
  // US ETFs
  { ticker: 'SPY',      name: 'SPDR S&P 500 ETF Trust' },
  { ticker: 'QQQ',      name: 'Invesco NASDAQ-100 ETF' },
  { ticker: 'VOO',      name: 'Vanguard S&P 500 ETF' },
  { ticker: 'VTI',      name: 'Vanguard Total Stock Market ETF' },
  { ticker: 'VT',       name: 'Vanguard Total World Stock ETF' },
  // US Stocks
  { ticker: 'AAPL',     name: 'Apple Inc.' },
  { ticker: 'MSFT',     name: 'Microsoft Corporation' },
  { ticker: 'GOOGL',    name: 'Alphabet Inc.' },
  { ticker: 'AMZN',     name: 'Amazon.com Inc.' },
  { ticker: 'NVDA',     name: 'NVIDIA Corporation' },
  { ticker: 'META',     name: 'Meta Platforms Inc.' },
  { ticker: 'TSLA',     name: 'Tesla Inc.' },
]
