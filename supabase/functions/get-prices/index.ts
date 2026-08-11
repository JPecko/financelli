const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Fetches close price from Stooq for one exact symbol. Ticker format: sxr8.de, vuaa.de, aapl.us
async function fetchStooqQuote(symbol: string): Promise<number | null> {
  const url = `https://stooq.com/q/l/?s=${encodeURIComponent(symbol.toLowerCase())}&f=sd2t2ohlcv&h&e=csv`
  const res = await fetch(url)
  if (!res.ok) return null
  const text = await res.text()
  const lines = text.trim().split('\n')
  // A real Stooq CSV always starts with this header; anything else is an error/blocked page
  if (lines.length < 2 || !lines[0].startsWith('Symbol,Date,Time')) return null
  // CSV columns: Symbol, Date, Time, Open, High, Low, Close, Volume
  const cols = lines[1].split(',')
  if (cols[6] === 'N/D') return null
  const close = parseFloat(cols[6])
  return isNaN(close) ? null : close
}

// Stooq requires an exchange suffix (.us, .de, ...). Bare tickers (e.g. "AAPL") default to US stocks.
async function fetchStooqPrice(ticker: string): Promise<number | null> {
  const direct = await fetchStooqQuote(ticker)
  if (direct !== null) return direct
  if (ticker.includes('.')) return null
  return fetchStooqQuote(`${ticker}.us`)
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

    const tickers = symbolsParam.split(',').map(s => s.trim())
    const entries = await Promise.all(
      tickers.map(async (t) => [t.toUpperCase(), await fetchStooqPrice(t)] as const)
    )
    const prices = Object.fromEntries(entries.filter(([, p]) => p !== null))
    const failed = entries.filter(([, p]) => p === null).map(([t]) => t)

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
