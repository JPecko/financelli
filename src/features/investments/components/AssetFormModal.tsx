import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/components/ui/dialog'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { toCents, fromCents } from '@/domain/money'
import { addAsset, updateAsset } from '@/shared/hooks/useAssets'
import { useT } from '@/shared/i18n'
import type { Asset } from '@/domain/types'

interface FormValues {
  name:         string
  ticker:       string
  currentPrice: string
}

interface Props {
  open:    boolean
  onClose: () => void
  asset?:  Asset
}

export default function AssetFormModal({ open, onClose, asset }: Props) {
  const t      = useT()
  const isEdit = !!asset

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    defaultValues: { name: '', ticker: '', currentPrice: '0' },
  })

  useEffect(() => {
    if (!open) return
    if (asset) {
      reset({
        name:         asset.name,
        ticker:       asset.ticker ?? '',
        currentPrice: fromCents(asset.currentPrice).toFixed(4),
      })
    } else {
      reset({ name: '', ticker: '', currentPrice: '0' })
    }
  }, [open, asset, reset])

  const onSubmit = async (values: FormValues) => {
    const payload = {
      name:         values.name.trim(),
      ticker:       values.ticker.trim().toUpperCase() || undefined,
      currentPrice: toCents(parseFloat(values.currentPrice) || 0),
    }
    if (isEdit && asset?.id != null) {
      await updateAsset(asset.id, payload)
    } else {
      await addAsset(payload)
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
            <Label htmlFor="a-ticker">
              {t('investments.ticker')} <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Input
              id="a-ticker"
              placeholder="e.g. VWCE, AAPL"
              className="uppercase"
              {...register('ticker')}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="a-price">{t('investments.currentPrice')}</Label>
            <Input
              id="a-price"
              type="number"
              step="0.0001"
              min="0"
              placeholder="0.00"
              {...register('currentPrice', { required: true })}
            />
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
