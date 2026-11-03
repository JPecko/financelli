import { useState } from 'react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { Button } from '@/shared/components/ui/button'
import { Label } from '@/shared/components/ui/label'
import AmountInput from '@/shared/components/AmountInput'
import CategorySelect from '@/features/transactions/components/CategorySelect'
import { fromCents, formatMoney, toCents } from '@/domain/money'
import { tCategory, type Category } from '@/domain/categories'
import { useT } from '@/shared/i18n'
import type { Budget } from '@/domain/types'

interface Props {
  budget?:             Budget
  initialCategory?:    string
  availableCategories: Category[]
  averages:            Record<string, number>
  onSave:              (category: string, amountCents: number) => Promise<void>
  onDelete:            (budget: Budget) => void
  onClose:             () => void
}

// Average rounded up to the next 10 € — a starting point the user can tweak
function suggestedAmount(averages: Record<string, number>, category: string) {
  const avg = averages[category] ?? 0
  return avg > 0 ? fromCents(Math.ceil(avg / 1000) * 1000).toFixed(2) : ''
}

// Mounted fresh for each draft (keyed by the page), so initial state comes straight from props
export default function BudgetFormModal({ budget, initialCategory, availableCategories, averages, onSave, onDelete, onClose }: Props) {
  const t = useT()
  const [category, setCategory] = useState(budget?.category ?? initialCategory ?? availableCategories[0]?.id ?? '')
  const [amount, setAmount] = useState(() => budget ? fromCents(budget.amountCents).toFixed(2) : suggestedAmount(averages, category))
  const [amountEdited, setAmountEdited] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const amountCents = toCents(parseFloat(amount.replace(',', '.')) || 0)
  const average     = Math.round(averages[category] ?? 0)

  const handleCategoryChange = (next: string) => {
    setCategory(next)
    if (!amountEdited) setAmount(suggestedAmount(averages, next))
  }

  const handleAmountChange = (value: string) => {
    setAmount(value)
    setAmountEdited(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!category || amountCents <= 0) return
    setSaving(true)
    setError(null)
    try {
      await onSave(category, amountCents)
    } catch (err) {
      console.error('Failed to save budget', err)
      // Supabase errors are plain objects with a message, not Error instances
      const message = (err as { message?: string } | null)?.message ?? String(err)
      setError(t('budgets.saveError', { message }))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{budget ? t('budgets.editTitle') : t('budgets.newTitle')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>{t('transactions.category')}</Label>
            {budget
              ? <p className="text-sm font-medium">{tCategory(budget.category, t)}</p>
              : <CategorySelect categories={availableCategories} value={category} onChange={handleCategoryChange} />}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="budget-amount">{t('budgets.monthlyLimit')}</Label>
            <AmountInput id="budget-amount" value={amount} onChange={e => handleAmountChange(e.target.value)} suffix="€" className="text-base md:text-base" />
            {average > 0 && (
              <p className="text-xs text-muted-foreground">
                {t('budgets.averageHint', { amount: formatMoney(average) })}{' '}
                <button type="button" className="font-medium text-primary underline-offset-2 hover:underline" onClick={() => handleAmountChange(fromCents(average).toFixed(2))}>
                  {t('budgets.useAverage')}
                </button>
              </p>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            {budget && (
              <Button type="button" variant="ghost" className="text-destructive" onClick={() => onDelete(budget)}>
                {t('common.delete')}
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
            <Button type="submit" loading={saving} disabled={!category || amountCents <= 0}>{t('common.save')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
