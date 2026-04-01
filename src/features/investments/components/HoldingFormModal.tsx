import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/components/ui/dialog'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { toCents, fromCents } from '@/domain/money'
import { addHolding, updateHolding } from '@/shared/hooks/useHoldings'
import { useT } from '@/shared/i18n'
import type { Asset, Holding } from '@/domain/types'

interface FormValues {
  assetId:  string
  quantity: string
  avgCost:  string
}

interface Props {
  open:      boolean
  onClose:   () => void
  accountId: number
  holding?:  Holding
  assets:    Asset[]
}

export default function HoldingFormModal({ open, onClose, accountId, holding, assets }: Props) {
  const t      = useT()
  const isEdit = !!holding

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<FormValues>({
    defaultValues: { assetId: '', quantity: '0', avgCost: '0' },
  })

  useEffect(() => {
    if (!open) return
    if (holding) {
      reset({
        assetId:  String(holding.assetId),
        quantity: String(holding.quantity),
        avgCost:  fromCents(holding.avgCost).toFixed(4),
      })
    } else {
      reset({ assetId: assets[0]?.id ? String(assets[0].id) : '', quantity: '0', avgCost: '0' })
    }
  }, [open, holding, assets, reset])

  const onSubmit = async (values: FormValues) => {
    const payload = {
      accountId,
      assetId:  parseInt(values.assetId),
      quantity: parseFloat(values.quantity) || 0,
      avgCost:  toCents(parseFloat(values.avgCost) || 0),
    }
    if (isEdit && holding?.id != null) {
      await updateHolding(holding.id, payload)
    } else {
      await addHolding(payload)
    }
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t('investments.editHolding') : t('investments.addHolding')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Asset picker */}
          <div className="space-y-1">
            <Label htmlFor="h-asset">{t('investments.asset')}</Label>
            {assets.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('investments.noAssetsToLink')}</p>
            ) : (
              <select
                id="h-asset"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                {...register('assetId', { required: true })}
              >
                {assets.map(a => (
                  <option key={a.id} value={String(a.id)}>
                    {a.name}{a.ticker ? ` (${a.ticker.toUpperCase()})` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Quantity + Avg Cost */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="h-qty">{t('investments.quantity')}</Label>
              <Input
                id="h-qty"
                type="number"
                step="0.000001"
                min="0"
                placeholder="0"
                {...register('quantity', { required: true })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="h-avgcost">{t('investments.avgCost')}</Label>
              <Input
                id="h-avgcost"
                type="number"
                step="0.0001"
                min="0"
                placeholder="0.00"
                {...register('avgCost', { required: true })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" loading={isSubmitting} disabled={assets.length === 0}>
              {isEdit ? t('common.save') : t('investments.addHolding')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
