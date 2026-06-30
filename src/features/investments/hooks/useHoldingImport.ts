import { useState, useCallback } from 'react'
import * as XLSX from 'xlsx'
import { addAsset, updateAsset } from '@/shared/hooks/useAssets'
import { addHolding, updateHolding, removeHolding } from '@/shared/hooks/useHoldings'
import { replacePurchaseHistory } from '@/shared/hooks/usePurchaseHistory'
import type { Asset, Holding } from '@/domain/types'
import type { BrokerKey } from '../utils/brokerTemplates'
import { BROKER_TEMPLATES } from '../utils/brokerTemplates'
import { parseCsvToRows, buildPreviewItems } from '../utils/holdingImportHelpers'
import type { ImportPreviewItem } from '../utils/holdingImportHelpers'

async function readFileAsText(file: File, separator: string): Promise<string> {
  if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
    const buffer = await file.arrayBuffer()
    const wb = XLSX.read(buffer, { type: 'array' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    return XLSX.utils.sheet_to_csv(ws, { FS: separator })
  }
  return file.text()
}

type Step = 'upload' | 'preview' | 'done'

export function useHoldingImport(accountId: number, broker: BrokerKey | null, assets: Asset[], holdings: Holding[]) {
  const [step,         setStep]         = useState<Step>('upload')
  const [previewItems, setPreviewItems] = useState<ImportPreviewItem[]>([])
  const [importing,    setImporting]    = useState(false)
  const [error,        setError]        = useState<string | null>(null)

  const handleFile = useCallback(async (file: File) => {
    setError(null)
    if (!broker) {
      setError('This account has no broker configured. Edit the account and set a broker first.')
      return
    }
    const template = BROKER_TEMPLATES[broker]
    if (!template) {
      setError(`No template found for broker "${broker}".`)
      return
    }

    const text = await readFileAsText(file, template.separator)
    const rows = parseCsvToRows(text, template)
    if (rows.length === 0) {
      setError('No valid transactions found in this file. Make sure you are using the correct broker export.')
      return
    }

    const items = buildPreviewItems(rows, assets, holdings, accountId)
    setPreviewItems(items)
    setStep('preview')
  }, [broker, assets, holdings, accountId])

  const handleConfirm = useCallback(async () => {
    setImporting(true)
    setError(null)
    try {
      // Pass 1: update assets and holdings (critical — must all succeed)
      const resolvedAssetIds = new Map<number, number>() // previewItems index → assetId

      for (let i = 0; i < previewItems.length; i++) {
        const item = previewItems[i]
        if (item.status === 'error' || item.status === 'remove') continue

        let assetId: number

        if (item.matchedAsset?.id != null) {
          assetId = item.matchedAsset.id
          if (item.row.isin && !item.matchedAsset.isin) {
            await updateAsset(assetId, { isin: item.row.isin })
          }
        } else {
          const created = await addAsset({
            name:         item.row.name,
            ticker:       item.row.ticker,
            isin:         item.row.isin,
            currentPrice: 0,
          })
          assetId = created.id!
        }

        const holdingDate = item.newDate ?? item.row.date

        if (item.existingHolding?.id != null) {
          await updateHolding(item.existingHolding.id, {
            quantity: item.newQuantity!,
            avgCost:  item.newAvgCost!,
            date:     holdingDate,
          })
        } else {
          await addHolding({
            accountId,
            assetId,
            quantity: item.newQuantity!,
            avgCost:  item.newAvgCost!,
            date:     holdingDate,
          })
        }

        resolvedAssetIds.set(i, assetId)
      }

      // Pass 2: remove holdings not in the CSV (source-of-truth replace semantics)
      for (const item of previewItems) {
        if (item.status === 'remove' && item.existingHolding?.id != null) {
          await removeHolding(item.existingHolding.id)
        }
      }

      // Pass 3: update purchase history (non-critical — failures don't block holdings)
      for (let i = 0; i < previewItems.length; i++) {
        const item = previewItems[i]
        if (item.status === 'error' || item.status === 'remove') continue
        const assetId = resolvedAssetIds.get(i)
        if (assetId == null) continue
        try {
          const historyItems = item.purchaseHistoryItems.map(h => ({ ...h, assetId }))
          await replacePurchaseHistory(accountId, assetId, historyItems)
        } catch {
          // purchase history is chart data; don't abort if it fails
        }
      }

      setStep('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed. Check console for details.')
      console.error('[HoldingImport] confirm error:', e)
    } finally {
      setImporting(false)
    }
  }, [previewItems, accountId])

  const reset = useCallback(() => {
    setStep('upload')
    setPreviewItems([])
    setError(null)
  }, [])

  const validItems  = previewItems.filter(i => i.status !== 'error')
  const errorItems  = previewItems.filter(i => i.status === 'error')
  const createCount = previewItems.filter(i => i.status === 'create').length
  const updateCount = previewItems.filter(i => i.status === 'update').length
  const removeCount = previewItems.filter(i => i.status === 'remove').length

  return { step, previewItems, validItems, errorItems, createCount, updateCount, removeCount, importing, error, handleFile, handleConfirm, reset }
}
