const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TD_API_KEY = Deno.env.get('TWELVE_DATA_API_KEY')

// Twelve Data's free tier only covers US exchanges — European tickers go through Yahoo instead.
const EU_SUFFIXES = new Set(['DE', 'PA', 'AS', 'MI', 'L', 'SW'])
const isEuTicker = (ticker: string) => EU_SUFFIXES.has(ticker.toUpperCase().split('.')[1] ?? '')

// Unofficial, no key required. Ticker format: SXR8.DE, VUAA.DE (exact Yahoo symbol).
async function fetchYahooPrice(ticker: string): Promise<number | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}`
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
  if (!res.ok) return null
  const data = await res.json()
  const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice
  return typeof price === 'number' ? price : null
}

type TdEntry = { price?: string; status?: string }

// US tickers only. Batches all symbols in one request; throws on a request-level failure (bad key, rate limit).
async function fetchTwelveDataPrices(tickers: string[]): Promise<{ prices: Record<string, number>; failed: string[] }> {
  if (tickers.length === 0) return { prices: {}, failed: [] }
  if (!TD_API_KEY) throw new Error('TWELVE_DATA_API_KEY is not configured')

  const symbols = tickers.map(t => t.toUpperCase().split('.')[0]) // strip ".US" if present
  const url = `https://api.twelvedata.com/price?symbol=${encodeURIComponent(symbols.join(','))}&apikey=${TD_API_KEY}`
  const res = await fetch(url)
  const data = await res.json()

  if (data.status === 'error') throw new Error(data.message ?? 'Twelve Data request failed')

  // A single-symbol request returns the entry directly instead of { [symbol]: entry }
  const entries: Record<string, TdEntry> = symbols.length === 1 ? { [symbols[0]]: data } : data

  const prices: Record<string, number> = {}
  const failed: string[] = []
  tickers.forEach((ticker, i) => {
    const entry = entries[symbols[i]]
    const price = entry?.status === 'error' ? NaN : parseFloat(entry?.price ?? '')
    if (isNaN(price)) failed.push(ticker.toUpperCase())
    else prices[ticker.toUpperCase()] = price
  })
  return { prices, failed }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const symbolsParam = url.searchParams.get('symbols')
    if (!symbolsParam) {
      return new Response(JSON.stringify({ error: 'symbols param required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const tickers = symbolsParam.split(',').map(s => s.trim()).filter(Boolean)
    const euTickers = tickers.filter(isEuTicker)
    const usTickers = tickers.filter(t => !isEuTicker(t))

    const [usResult, euEntries] = await Promise.all([
      fetchTwelveDataPrices(usTickers),
      Promise.all(euTickers.map(async t => [t.toUpperCase(), await fetchYahooPrice(t)] as const)),
    ])

    const prices: Record<string, number> = { ...usResult.prices }
    const failed: string[] = [...usResult.failed]
    for (const [ticker, price] of euEntries) {
      if (price === null) failed.push(ticker)
      else prices[ticker] = price
    }

    return new Response(JSON.stringify({ prices, failed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
