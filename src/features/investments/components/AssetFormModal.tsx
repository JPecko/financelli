import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import TickerSuggestInput from './TickerSuggestInput'
import { format } from 'date-fns'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/components/ui/dialog'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { toCents, fromCents } from '@/domain/money'
import { addAsset, updateAsset } from '@/shared/hooks/useAssets'
import { upsertAssetPrice } from '@/shared/hooks/useAssetPrices'
import { useT } from '@/shared/i18n'
import type { Asset } from '@/domain/types'

interface FormValues {
  name:         string
  label:        string
  ticker:       string
  currentPrice: string
  priceDate:    string
}

interface Props {
  open:    boolean
  onClose: () => void
  asset?:  Asset
}

export default function AssetFormModal({ open, onClose, asset }: Props) {
  const t      = useT()
  const isEdit = !!asset

  const today = format(new Date(), 'yyyy-MM-dd')

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormValues>({
    defaultValues: { name: '', label: '', ticker: '', currentPrice: '0', priceDate: today },
  })

  useEffect(() => {
    if (!open) return
    if (asset) {
      reset({
        name:         asset.name,
        label:        asset.label ?? '',
        ticker:       asset.ticker ?? '',
        currentPrice: fromCents(asset.currentPrice).toFixed(4),
        priceDate:    today,
      })
    } else {
      reset({ name: '', label: '', ticker: '', currentPrice: '0', priceDate: today })
    }
  }, [open, asset, reset, today])

  const onSubmit = async (values: FormValues) => {
    const priceCents = toCents(parseFloat(values.currentPrice.replace(',', '.')) || 0)
    const payload = {
      name:         values.name.trim(),
      label:        values.label.trim() || undefined,
      ticker:       values.ticker.trim().toUpperCase() || undefined,
      currentPrice: priceCents,
    }
    if (isEdit && asset?.id != null) {
      await updateAsset(asset.id, payload)
      if (values.priceDate) await upsertAssetPrice(asset.id, priceCents, values.priceDate)
    } else {
      const created = await addAsset(payload)
      if (values.priceDate && created.id != null) {
        await upsertAssetPrice(created.id, priceCents, values.priceDate)
      }
    }
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t('investments.editAsset') : t('investments.addAsset')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="space-y-1">
            <Label htmlFor="a-name">{t('investments.assetName')}</Label>
            <Input
              id="a-name"
              placeholder="e.g. VWCE ETF, Apple Inc."
              {...register('name', { required: 'Name is required' })}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="a-label">
              {t('investments.label')} <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Input
              id="a-label"
              placeholder="e.g. S&P 500 ETF, Tech Giant"
              {...register('label')}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="a-ticker">
              {t('investments.ticker')} <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <TickerSuggestInput
              id="a-ticker"
              value={watch('ticker')}
              onChange={v => setValue('ticker', v)}
              placeholder={t('investments.simulatorTickerPlaceholder')}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="a-price">{t('investments.currentPrice')}</Label>
              <Input
                id="a-price"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                {...register('currentPrice', { required: true })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="a-price-date">{t('investments.priceDate')}</Label>
              <Input
                id="a-price-date"
                type="date"
                {...register('priceDate')}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {isEdit ? t('common.save') : t('investments.addAsset')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
