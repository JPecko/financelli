import { parse as parseDate, format as formatDate } from 'date-fns'
import { toCents } from '@/domain/money'
import type { Asset, Holding, PurchaseHistory } from '@/domain/types'
import type { BrokerTemplate } from './brokerTemplates'

export type ImportRow = {
  date: string          // YYYY-MM-DD
  name: string
  ticker?: string
  isin?: string
  quantity: number
  price: number         // EUR per unit (float)
  type: 'buy' | 'sell'
}

export type ImportPreviewItem = {
  row: ImportRow
  status: 'create' | 'update' | 'error' | 'remove'
  errorMessage?: string
  matchedAsset?: Asset
  existingHolding?: Holding
  newQuantity?: number
  newAvgCost?: number        // cents
  newDate?: string           // most recent purchase date (YYYY-MM-DD)
  purchaseHistoryItems: Omit<PurchaseHistory, 'id' | 'createdAt'>[]
}

// ---------------------------------------------------------------------------
// CSV parsing
// ---------------------------------------------------------------------------

function splitCsvLine(line: string, separator: string): string[] {
  const cells: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === separator && !inQuotes) {
      cells.push(cur.trim())
      cur = ''
    } else {
      cur += ch
    }
  }
  cells.push(cur.trim())
  return cells
}

function parseNum(value: string, decimal: '.' | ','): number {
  const cleaned = decimal === ','
    ? value.replace(/\./g, '').replace(',', '.')
    : value.replace(/,/g, '')
  return parseFloat(cleaned) || 0
}

export function parseCsvToRows(raw: string, template: BrokerTemplate): ImportRow[] {
  // Normalise line endings, strip BOM
  const text = raw.replace(/^﻿/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = text.split('\n').filter(l => l.trim() !== '')

  const { separator, skipToHeader, headerFirstCell, columns, dateFormat, decimalSeparator } = template

  // Find header row index
  let headerIdx = 0
  if (skipToHeader && headerFirstCell) {
    headerIdx = lines.findIndex(l => {
      const first = splitCsvLine(l, separator)[0]
      return first.replace(/^"/, '').replace(/"$/, '') === headerFirstCell
    })
    if (headerIdx === -1) return []
  }

  const headers = splitCsvLine(lines[headerIdx], separator).map(h => h.replace(/^"|"$/g, ''))
  const colIdx = (name: string) => headers.indexOf(name)

  const rows: ImportRow[] = []

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i], separator).map(c => c.replace(/^"|"$/g, ''))
    if (cells.every(c => c === '')) continue

    const get = (col: string) => (col ? (cells[colIdx(col)] ?? '') : '')

    // --- Type filtering ---
    if (columns.typeCol) {
      const typeVal = get(columns.typeCol)
      // For Trade Republic: category must be TRADING and type must be BUY/SELL
      if (columns.buyValue && columns.buyValue === 'TRADING') {
        if (typeVal !== 'TRADING') continue
        const txType = get('type')
        if (txType !== 'BUY' && txType !== 'SELL') continue
      } else if (columns.buyValue && typeVal !== columns.buyValue) {
        continue
      }
    }

    // --- Date ---
    const rawDate = get(columns.date)
    if (!rawDate) continue
    let dateStr: string
    try {
      const parsed = parseDate(rawDate.substring(0, dateFormat.length), dateFormat, new Date())
      dateStr = formatDate(parsed, 'yyyy-MM-dd')
    } catch {
      continue
    }

    // --- Quantity + Price ---
    let quantity = 0
    let price = 0

    if (columns.commentCol && columns.commentRegex) {
      const comment = get(columns.commentCol)
      const match = comment.match(new RegExp(columns.commentRegex))
      if (!match) continue
      quantity = parseFloat(match[1]) || 0
      price    = parseFloat(match[2]) || 0
    } else {
      quantity = Math.abs(parseNum(get(columns.quantity), decimalSeparator))
      price    = Math.abs(parseNum(get(columns.price), decimalSeparator))
    }

    if (quantity <= 0 || price <= 0) continue

    // --- Buy / Sell type ---
    let type: 'buy' | 'sell' = 'buy'
    if (columns.amountSignCol) {
      const amt = parseNum(get(columns.amountSignCol), decimalSeparator)
      type = amt < 0 ? 'buy' : 'sell'
    } else if (columns.typeCol && columns.buyValue === 'TRADING') {
      type = get('type') === 'SELL' ? 'sell' : 'buy'
    }

    rows.push({
      date:     dateStr,
      name:     get(columns.name),
      ticker:   columns.ticker ? get(columns.ticker) || undefined : undefined,
      isin:     columns.isin ? get(columns.isin) || undefined : undefined,
      quantity,
      price,
      type,
    })
  }

  return rows
}

// ---------------------------------------------------------------------------
// Asset matching
// ---------------------------------------------------------------------------

export function matchAsset(row: ImportRow, assets: Asset[]): Asset | undefined {
  if (row.isin) {
    const byIsin = assets.find(a => a.isin && a.isin.toUpperCase() === row.isin!.toUpperCase())
    if (byIsin) return byIsin
  }
  if (row.ticker) {
    const byTicker = assets.find(a => a.ticker && a.ticker.toUpperCase() === row.ticker!.toUpperCase())
    if (byTicker) return byTicker
  }
  return undefined
}

// ---------------------------------------------------------------------------
// Aggregation: multiple rows for same asset → single holding
// ---------------------------------------------------------------------------

type AggregatedAsset = {
  rows: ImportRow[]
  totalQty: number
  weightedCostCents: number   // sum of (qty * priceCents) for buys
  ticker?: string
  isin?: string
  name: string
}

function aggregateRows(rows: ImportRow[]): AggregatedAsset[] {
  const map = new Map<string, AggregatedAsset>()

  for (const row of rows) {
    const key = row.isin ?? row.ticker ?? row.name
    if (!map.has(key)) {
      map.set(key, { rows: [], totalQty: 0, weightedCostCents: 0, ticker: row.ticker, isin: row.isin, name: row.name })
    }
    const agg = map.get(key)!
    agg.rows.push(row)
    const priceCents = toCents(row.price)
    if (row.type === 'buy') {
      agg.totalQty          += row.quantity
      agg.weightedCostCents += row.quantity * priceCents
    } else {
      agg.totalQty -= row.quantity
    }
  }

  return Array.from(map.values())
}

// ---------------------------------------------------------------------------
// Build preview items
// ---------------------------------------------------------------------------

export function buildPreviewItems(
  rows: ImportRow[],
  assets: Asset[],
  holdings: Holding[],
  accountId: number,
): ImportPreviewItem[] {
  const aggregated = aggregateRows(rows)
  const assetMap   = Object.fromEntries(assets.map(a => [a.id!, a]))

  const items: ImportPreviewItem[] = aggregated.map(agg => {
    const sampleRow    = agg.rows[0]
    const matchedAsset = matchAsset(sampleRow, assets)

    const purchaseHistoryItems: Omit<PurchaseHistory, 'id' | 'createdAt'>[] = agg.rows.map(r => ({
      accountId,
      assetId:    matchedAsset?.id ?? 0,
      date:       r.date,
      quantity:   r.type === 'sell' ? -r.quantity : r.quantity,
      priceCents: toCents(r.price),
    }))

    const newDate = agg.rows.reduce(
      (max, r) => r.date > max ? r.date : max,
      agg.rows[0].date,
    )

    if (agg.totalQty < 0) {
      return {
        row:                  sampleRow,
        status:               'error',
        errorMessage:         'Resulting quantity would be negative',
        matchedAsset,
        purchaseHistoryItems: [],
      }
    }

    const newAvgCost = agg.totalQty > 0
      ? Math.round(agg.weightedCostCents / agg.totalQty)
      : 0

    if (!matchedAsset) {
      return {
        row:                  sampleRow,
        status:               'create',
        newQuantity:          agg.totalQty,
        newAvgCost,
        newDate,
        purchaseHistoryItems,
      }
    }

    const existingHolding = holdings.find(
      h => h.accountId === accountId && h.assetId === matchedAsset.id,
    )

    return {
      row:                  sampleRow,
      status:               existingHolding ? 'update' : 'create',
      matchedAsset,
      existingHolding,
      newQuantity:          agg.totalQty,
      newAvgCost,
      newDate,
      purchaseHistoryItems,
    }
  })

  // Holdings in this account not being updated by the import → will be removed.
  // This covers: (a) assets not in the CSV at all, and (b) duplicate holdings for
  // the same asset (one per transaction) — the import keeps only the matched one.
  const usedHoldingIds = new Set<number>(
    items.flatMap(i => i.existingHolding?.id != null ? [i.existingHolding.id] : []),
  )

  for (const h of holdings.filter(h => h.accountId === accountId)) {
    if (h.id == null || usedHoldingIds.has(h.id)) continue
    const asset = assetMap[h.assetId]
    items.push({
      row: {
        date:     h.date ?? '',
        name:     asset?.name ?? '—',
        ticker:   asset?.ticker,
        isin:     asset?.isin,
        quantity: h.quantity,
        price:    h.avgCost / 100,
        type:     'buy',
      },
      status:               'remove',
      matchedAsset:         asset,
      existingHolding:      h,
      purchaseHistoryItems: [],
    })
  }

  return items
}
