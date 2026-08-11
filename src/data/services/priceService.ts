type PricesResponse = {
  prices?: Record<string, number>
  failed?: string[]
  error?: string
}

export type PriceSyncResult = {
  prices: Record<string, number>
  failed: string[]
}

const EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-prices`
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

/**
 * Fetches current prices via the Supabase Edge Function (Stooq backend).
 * Returns a map of UPPERCASE ticker → price in cents, plus tickers Stooq couldn't resolve.
 * Ticker format: SXR8.DE (Xetra), VUAA.DE, AAPL (US stocks, ".US" inferred server-side).
 */
export async function fetchPricesCents(tickers: string[]): Promise<PriceSyncResult> {
  if (tickers.length === 0) return { prices: {}, failed: [] }

  const symbols = tickers.map(t => t.toUpperCase()).join(',')
  const res = await fetch(`${EDGE_URL}?symbols=${encodeURIComponent(symbols)}`, {
    headers: { Authorization: `Bearer ${ANON_KEY}`, apikey: ANON_KEY },
  })

  const data = await res.json() as PricesResponse
  if (data.error) throw new Error(data.error)
  if (!res.ok) throw new Error(`Price fetch failed: HTTP ${res.status}`)

  const prices: Record<string, number> = {}
  for (const [ticker, price] of Object.entries(data.prices ?? {})) {
    prices[ticker] = Math.round(price * 100)
  }
  return { prices, failed: data.failed ?? [] }
}
