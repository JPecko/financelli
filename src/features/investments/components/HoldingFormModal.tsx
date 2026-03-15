import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/components/ui/dialog'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { toCents, fromCents } from '@/domain/money'
import { addHolding, updateHolding } from '@/shared/hooks/useHoldings'
import { useT } from '@/shared/i18n'
import type { Holding } from '@/domain/types'

interface FormValues {
  name:         string
  ticker:       string
  quantity:     string
  avgCost:      string
  currentPrice: string
}

interface Props {
  open:      boolean
  onClose:   () => void
  accountId: number
  holding?:  Holding
}

export default function HoldingFormModal({ open, onClose, accountId, holding }: Props) {
  const t      = useT()
  const isEdit = !!holding

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    defaultValues: { name: '', ticker: '', quantity: '0', avgCost: '0', currentPrice: '0' },
  })

  useEffect(() => {
    if (!open) return
    if (holding) {
      reset({
        name:         holding.name,
        ticker:       holding.ticker ?? '',
        quantity:     String(holding.quantity),
        avgCost:      fromCents(holding.avgCost).toFixed(4),
        currentPrice: fromCents(holding.currentPrice).toFixed(4),
      })
    } else {
      reset({ name: '', ticker: '', quantity: '0', avgCost: '0', currentPrice: '0' })
    }
  }, [open, holding, reset])

  const onSubmit = async (values: FormValues) => {
    const payload = {
      accountId,
      name:         values.name.trim(),
      ticker:       values.ticker.trim() || undefined,
      quantity:     parseFloat(values.quantity) || 0,
      avgCost:      toCents(parseFloat(values.avgCost) || 0),
      currentPrice: toCents(parseFloat(values.currentPrice) || 0),
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
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t('investments.editHolding') : t('investments.addHolding')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Name */}
          <div className="space-y-1">
            <Label htmlFor="h-name">{t('investments.holding')}</Label>
            <Input
              id="h-name"
              placeholder="e.g. VWCE ETF, Apple Inc."
              {...register('name', { required: 'Name is required' })}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          {/* Ticker */}
          <div className="space-y-1">
            <Label htmlFor="h-ticker">{t('investments.ticker')} <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input
              id="h-ticker"
              placeholder="e.g. VWCE, AAPL"
              className="uppercase"
              {...register('ticker')}
            />
          </div>

          {/* Quantity */}
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

          {/* Avg Cost + Current Price */}
          <div className="grid grid-cols-2 gap-3">
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
            <div className="space-y-1">
              <Label htmlFor="h-price">{t('investments.currentPrice')}</Label>
              <Input
                id="h-price"
                type="number"
                step="0.0001"
                min="0"
                placeholder="0.00"
                {...register('currentPrice', { required: true })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {isEdit ? t('common.save') : t('investments.addHolding')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
