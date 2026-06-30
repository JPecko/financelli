import { useRef } from 'react'
import { Upload, CheckCircle, AlertCircle, FileText } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/components/ui/dialog'
import { Button } from '@/shared/components/ui/button'
import { fromCents } from '@/domain/money'
import { useHoldingImport } from '../hooks/useHoldingImport'
import { BROKER_TEMPLATES } from '../utils/brokerTemplates'
import type { BrokerKey } from '../utils/brokerTemplates'
import type { ImportPreviewItem } from '../utils/holdingImportHelpers'
import type { Asset, Holding } from '@/domain/types'

interface Props {
  open:      boolean
  onClose:   () => void
  accountId: number
  broker:    string | null | undefined
  assets:    Asset[]
  holdings:  Holding[]
}

export default function HoldingImportModal({ open, onClose, accountId, broker, assets, holdings }: Props) {
  const brokerKey  = (broker && broker in BROKER_TEMPLATES) ? broker as BrokerKey : null
  const brokerLabel = brokerKey ? BROKER_TEMPLATES[brokerKey].label : null
  const fileRef    = useRef<HTMLInputElement>(null)

  const { step, previewItems, createCount, updateCount, removeCount, errorItems, importing, error, handleFile, handleConfirm, reset } = useHoldingImport(accountId, brokerKey, assets, holdings)

  const handleClose = () => { reset(); onClose() }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) void handleFile(file)
    e.target.value = ''
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Import Holdings from CSV / XLSX</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2">
          {step === 'upload' && (
            <UploadStep
              brokerLabel={brokerLabel}
              error={error}
              fileRef={fileRef}
            />
          )}

          {step === 'preview' && (
            <PreviewStep items={previewItems} />
          )}

          {step === 'done' && (
            <DoneStep createCount={createCount} updateCount={updateCount} removeCount={removeCount} />
          )}
        </div>

        <DialogFooter className="pt-2">
          {step === 'upload' && (
            <>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={() => fileRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                Choose file
              </Button>
            </>
          )}
          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={reset}>Back</Button>
              <Button
                onClick={() => void handleConfirm()}
                loading={importing}
                disabled={previewItems.every(i => i.status === 'error' || i.status === 'remove')}
              >
                Import {createCount + updateCount} holding{createCount + updateCount !== 1 ? 's' : ''}
                {removeCount > 0 && `, remove ${removeCount}`}
                {errorItems.length > 0 && ` (${errorItems.length} skipped)`}
              </Button>
            </>
          )}
          {step === 'done' && (
            <Button onClick={handleClose}>Done</Button>
          )}
        </DialogFooter>

        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={onFileChange}
        />
      </DialogContent>
    </Dialog>
  )
}

function UploadStep({ brokerLabel, error, fileRef }: {
  brokerLabel: string | null
  error: string | null
  fileRef: React.RefObject<HTMLInputElement | null>
}) {
  return (
    <div className="space-y-4">
      {brokerLabel ? (
        <p className="text-sm text-muted-foreground">
          Detected broker: <span className="font-medium text-foreground">{brokerLabel}</span>.
          Export your transaction history as CSV or XLSX from {brokerLabel} and upload it here.
        </p>
      ) : (
        <p className="text-sm text-destructive">
          This account has no broker configured. Edit the account and set a broker first.
        </p>
      )}

      <button
        type="button"
        disabled={!brokerLabel}
        onClick={() => fileRef.current?.click()}
        className="w-full border-2 border-dashed rounded-lg p-10 flex flex-col items-center gap-3 text-muted-foreground hover:border-primary hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <FileText className="h-10 w-10" />
        <span className="text-sm font-medium">Click to choose a file</span>
        <span className="text-xs">CSV and XLSX files are supported</span>
      </button>

      {error && (
        <p className="text-sm text-destructive flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}

function PreviewStep({ items }: { items: ImportPreviewItem[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No transactions found.</p>
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Review the changes below before confirming.
      </p>
      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Asset</th>
              <th className="text-right px-3 py-2 font-medium">Qty</th>
              <th className="text-right px-3 py-2 font-medium">Avg Cost</th>
              <th className="text-center px-3 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((item, i) => (
              <PreviewRow key={i} item={item} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PreviewRow({ item }: { item: ImportPreviewItem }) {
  const assetLabel = item.matchedAsset
    ? (item.matchedAsset.label ?? item.matchedAsset.name)
    : item.row.name

  const ticker = item.row.ticker ?? item.matchedAsset?.ticker
  const isRemove = item.status === 'remove'
  const isError  = item.status === 'error'

  return (
    <tr className={
      isRemove ? 'bg-destructive/5 text-muted-foreground' :
      isError  ? 'bg-muted/30 text-muted-foreground line-through' : ''
    }>
      <td className="px-3 py-2">
        <span className="font-medium">{assetLabel}</span>
        {ticker && <span className="text-muted-foreground text-xs ml-1.5">({ticker})</span>}
        {item.status === 'create' && !item.matchedAsset && (
          <span className="ml-1.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded px-1">new asset</span>
        )}
        {isError && (
          <span className="ml-1.5 text-xs text-destructive">{item.errorMessage}</span>
        )}
      </td>
      <td className="px-3 py-2 text-right tabular-nums">
        {isRemove
          ? item.existingHolding?.quantity.toFixed(4) ?? '—'
          : item.newQuantity?.toFixed(4) ?? '—'}
      </td>
      <td className="px-3 py-2 text-right tabular-nums">
        {isRemove
          ? (item.existingHolding ? `€${fromCents(item.existingHolding.avgCost).toFixed(2)}` : '—')
          : (item.newAvgCost != null ? `€${fromCents(item.newAvgCost).toFixed(2)}` : '—')}
      </td>
      <td className="px-3 py-2 text-center">
        <StatusBadge status={item.status} />
      </td>
    </tr>
  )
}

function StatusBadge({ status }: { status: ImportPreviewItem['status'] }) {
  if (status === 'create') return <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded px-1.5 py-0.5">create</span>
  if (status === 'update') return <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded px-1.5 py-0.5">update</span>
  if (status === 'remove') return <span className="text-xs bg-destructive/10 text-destructive rounded px-1.5 py-0.5">remove</span>
  return <span className="text-xs bg-muted text-muted-foreground rounded px-1.5 py-0.5">skip</span>
}

function DoneStep({ createCount, updateCount, removeCount }: { createCount: number; updateCount: number; removeCount: number }) {
  const parts: string[] = []
  if (createCount > 0) parts.push(`${createCount} created`)
  if (updateCount > 0) parts.push(`${updateCount} updated`)
  if (removeCount > 0) parts.push(`${removeCount} removed`)
  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center">
      <CheckCircle className="h-12 w-12 text-green-500" />
      <p className="font-medium">Import complete</p>
      <p className="text-sm text-muted-foreground">{parts.join(', ')}</p>
    </div>
  )
}
