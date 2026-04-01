import { useState } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/components/ui/dialog'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { toCents, fromCents, formatMoney } from '@/domain/money'
import { addTransaction } from '@/shared/hooks/useTransactions'
import { isoToday } from '@/shared/utils/format'
import type { Account } from '@/domain/types'

interface Props {
  open: boolean
  onClose: () => void
  account: Account
}

export default function RevalueModal({ open, onClose, account }: Props) {
  const currentDecimal = fromCents(account.balance)
  const [newValue, setNewValue] = useState(currentDecimal.toFixed(2))

  const newCents  = toCents(parseFloat(newValue) || 0)
  const delta     = newCents - account.balance
  const isGain    = delta > 0
  const unchanged = delta === 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (unchanged || account.id == null) return

    await addTransaction({
      accountId:   account.id,
      type:        'revaluation',
      amount:      delta,
      category:    'revaluation',
      description: `Market update — ${account.name}`,
      date:        isoToday(),
    })
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Market Value</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 py-2">
          <div className="rounded-lg bg-muted px-4 py-3 text-sm">
            <p className="text-muted-foreground">Current value</p>
            <p className="text-xl font-bold mt-0.5">
              {formatMoney(account.balance, account.currency)}
            </p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="new-value">New market value ({account.currency})</Label>
            <Input
              id="new-value"
              type="number"
              step="0.01"
              min="0"
              value={newValue}
              onChange={e => setNewValue(e.target.value)}
              autoFocus
            />
          </div>

          {/* Delta preview */}
          {!unchanged && (
            <div
              className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium ${
                isGain
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-400'
              }`}
            >
              {isGain
                ? <TrendingUp className="h-4 w-4 shrink-0" />
                : <TrendingDown className="h-4 w-4 shrink-0" />
              }
              <span>
                {isGain ? 'Market gain' : 'Market loss'} of{' '}
                <strong>{formatMoney(Math.abs(delta), account.currency)}</strong>
                {' '}will be recorded
              </span>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={unchanged}>
              Update Value
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
