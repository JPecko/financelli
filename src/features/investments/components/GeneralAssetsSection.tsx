import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { formatMoney } from '@/domain/money'
import { useT } from '@/shared/i18n'
import type { Asset } from '@/domain/types'

interface EditingPrice {
  assetId: number
  value: string
  date: string   // YYYY-MM-DD
}

interface Props {
  assets: Asset[]
  editingPrice: EditingPrice | null
  priceInputRef: React.RefObject<HTMLInputElement | null>
  onAddAsset: () => void
  onEditAsset: (asset: Asset) => void
  onDeleteAsset: (asset: Asset) => void
  onStartEditPrice: (asset: Asset) => void
  onPriceChange: (value: string) => void
  onDateChange: (date: string) => void
  onCommitEditPrice: (asset: Asset) => void
  onCancelEditPrice: () => void
}

function AssetPriceField({
  asset,
  editingPrice,
  priceInputRef,
  onStartEditPrice,
  onPriceChange,
  onDateChange,
  onCommitEditPrice,
  onCancelEditPrice,
}: {
  asset: Asset
  editingPrice: EditingPrice | null
  priceInputRef: React.RefObject<HTMLInputElement | null>
  onStartEditPrice: (asset: Asset) => void
  onPriceChange: (value: string) => void
  onDateChange: (date: string) => void
  onCommitEditPrice: (asset: Asset) => void
  onCancelEditPrice: () => void
}) {
  const isEditing = editingPrice?.assetId === asset.id

  if (isEditing) {
    return (
      <div
        className="flex flex-col items-end gap-1.5"
        onBlur={e => {
          // commit only when focus leaves the entire compound editor
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            void onCommitEditPrice(asset)
          }
        }}
      >
        <input
          ref={priceInputRef}
          type="text"
          inputMode="decimal"
          className="h-9 w-28 rounded-lg border border-primary bg-background px-2 text-right text-base tabular-nums focus:outline-none focus:ring-1 focus:ring-primary"
          value={editingPrice?.value ?? ''}
          onChange={e => onPriceChange(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') e.currentTarget.blur()
            if (e.key === 'Escape') onCancelEditPrice()
          }}
          onClick={e => e.stopPropagation()}
        />
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground whitespace-nowrap">price date</span>
          <input
            type="date"
            className="h-8 w-32 rounded-lg border border-primary/60 bg-background px-2 text-xs tabular-nums focus:outline-none focus:ring-1 focus:ring-primary"
            value={editingPrice?.date ?? ''}
            onChange={e => onDateChange(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') void onCommitEditPrice(asset)
              if (e.key === 'Escape') onCancelEditPrice()
            }}
            onClick={e => e.stopPropagation()}
          />
        </div>
      </div>
    )
  }

  return (
    <button
      type="button"
      className="text-right font-semibold tabular-nums transition hover:text-foreground hover:underline hover:decoration-dotted"
      onClick={() => onStartEditPrice(asset)}
      title="Click to update price"
    >
      {formatMoney(asset.currentPrice)}
    </button>
  )
}

function AssetRow({
  asset,
  editingPrice,
  priceInputRef,
  onEditAsset,
  onDeleteAsset,
  onStartEditPrice,
  onPriceChange,
  onDateChange,
  onCommitEditPrice,
  onCancelEditPrice,
}: {
  asset: Asset
  editingPrice: EditingPrice | null
  priceInputRef: React.RefObject<HTMLInputElement | null>
  onEditAsset: (asset: Asset) => void
  onDeleteAsset: (asset: Asset) => void
  onStartEditPrice: (asset: Asset) => void
  onPriceChange: (value: string) => void
  onDateChange: (date: string) => void
  onCommitEditPrice: (asset: Asset) => void
  onCancelEditPrice: () => void
}) {
  const t = useT()

  return (
    <div className="grid gap-3 border-b px-4 py-3 last:border-b-0 lg:hidden">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{asset.name}</p>
          <p className="mt-0.5 text-xs uppercase tracking-wide text-muted-foreground">
            {asset.ticker ?? '—'}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            onClick={() => onEditAsset(asset)}
            aria-label={`${t('common.edit')} ${asset.name}`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onDeleteAsset(asset)}
            aria-label={`${t('common.delete')} ${asset.name}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-muted/30 px-3 py-2">
          <p className="text-[11px] text-muted-foreground">{t('investments.currentPrice')}</p>
          <div className="mt-1">
            <AssetPriceField
              asset={asset}
              editingPrice={editingPrice}
              priceInputRef={priceInputRef}
              onStartEditPrice={onStartEditPrice}
              onPriceChange={onPriceChange}
              onDateChange={onDateChange}
              onCommitEditPrice={onCommitEditPrice}
              onCancelEditPrice={onCancelEditPrice}
            />
          </div>
        </div>
        <div className="rounded-lg bg-muted/30 px-3 py-2">
          <p className="text-[11px] text-muted-foreground">{t('investments.assetName')}</p>
          <p className="mt-1 truncate text-sm font-medium">{asset.name}</p>
        </div>
      </div>
    </div>
  )
}

export default function GeneralAssetsSection({
  assets,
  editingPrice,
  priceInputRef,
  onAddAsset,
  onEditAsset,
  onDeleteAsset,
  onStartEditPrice,
  onPriceChange,
  onDateChange,
  onCommitEditPrice,
  onCancelEditPrice,
}: Props) {
  const t = useT()

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">{t('investments.assets')}</h2>
        <Button variant="outline" size="sm" onClick={onAddAsset}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          {t('investments.addAsset')}
        </Button>
      </div>

      {assets.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">{t('investments.noAssets')}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="lg:hidden">
            {assets.map(asset => (
              <AssetRow
                key={asset.id}
                asset={asset}
                editingPrice={editingPrice}
                priceInputRef={priceInputRef}
                onEditAsset={onEditAsset}
                onDeleteAsset={onDeleteAsset}
                onStartEditPrice={onStartEditPrice}
                onPriceChange={onPriceChange}
                onDateChange={onDateChange}
                onCommitEditPrice={onCommitEditPrice}
                onCancelEditPrice={onCancelEditPrice}
              />
            ))}
          </div>

          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                  <th className="px-5 py-2.5 text-left font-medium">{t('investments.assetName')}</th>
                  <th className="px-4 py-2.5 text-left font-medium">{t('investments.ticker')}</th>
                  <th className="px-4 py-2.5 text-right font-medium">{t('investments.currentPrice')}</th>
                  <th className="w-16 px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {assets.map(asset => (
                  <tr key={asset.id} className="border-b last:border-0 hover:bg-accent/20 transition-colors">
                    <td className="px-5 py-3 font-medium">{asset.name}</td>
                    <td className="px-4 py-3 text-xs uppercase text-muted-foreground">{asset.ticker ?? '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <AssetPriceField
                        asset={asset}
                        editingPrice={editingPrice}
                        priceInputRef={priceInputRef}
                        onStartEditPrice={onStartEditPrice}
                        onPriceChange={onPriceChange}
                        onDateChange={onDateChange}
                        onCommitEditPrice={onCommitEditPrice}
                        onCancelEditPrice={onCancelEditPrice}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                          onClick={() => onEditAsset(asset)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => onDeleteAsset(asset)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
