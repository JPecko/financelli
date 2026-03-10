import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/components/ui/dialog'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { useTransactionForm } from './useTransactionForm'
import TransactionTypeTabs from './TransactionTypeTabs'
import AccountSelector from './AccountSelector'
import CategorySelect from './CategorySelect'
import type { Transaction, TransactionType } from '@/domain/types'
import { useT } from '@/shared/i18n'

interface Props {
  open:              boolean
  onClose:           () => void
  transaction?:      Transaction
  defaultType?:      TransactionType
  defaultAccountId?: string
}

export default function TransactionFormModal({ open, onClose, transaction, defaultType, defaultAccountId }: Props) {
  const t = useT()
  const {
    form,
    isEdit,
    isTransfer,
    isValid,
    isSharedAccount,
    categories,
    accounts,
    accountOptions,
    selectedType,
    selectedFrom,
    selectedTo,
    handleTypeChange,
    onSubmit,
  } = useTransactionForm({ open, onClose, transaction, defaultType, defaultAccountId })

  const { register, watch, setValue, formState: { errors, isSubmitting } } = form
  const isShared = watch('isShared')

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Transaction' : 'New Transaction'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 py-2">

          <TransactionTypeTabs value={selectedType} onChange={handleTypeChange} />

          <AccountSelector
            isTransfer={isTransfer}
            fromId={selectedFrom}
            toId={selectedTo}
            onFromChange={v => setValue('fromId', v)}
            onToChange={v => setValue('toId', v)}
            accountOptions={accountOptions}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="tx-amount">Amount</Label>
              <Input
                id="tx-amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...register('amount', { required: 'Required', min: { value: 0.01, message: 'Must be > 0' } })}
              />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="tx-date">Date</Label>
              <Input id="tx-date" type="date" {...register('date', { required: true })} />
            </div>
          </div>

          <CategorySelect
            categories={categories}
            value={form.watch('category')}
            onChange={v => setValue('category', v)}
          />

          <div className="space-y-1">
            <Label htmlFor="tx-desc">Description</Label>
            <Input id="tx-desc" placeholder="e.g. Electricity bill" {...register('description')} />
          </div>

          {isSharedAccount && !isTransfer && (
            <label className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3 cursor-pointer hover:bg-accent/60 transition-colors">
              <div>
                <p className="text-sm font-medium leading-none">{t('transactions.sharedWithParticipants')}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('transactions.sharedWithParticipantsDesc')}</p>
              </div>
              <div className="relative shrink-0" onClick={e => { e.preventDefault(); setValue('isShared', !isShared) }}>
                <div className={`h-5 w-9 rounded-full transition-colors ${isShared ? 'bg-primary' : 'bg-muted'}`} />
                <div className={`absolute top-1 h-3 w-3 rounded-full bg-white transition-transform ${isShared ? 'left-5' : 'left-1'}`} />
              </div>
            </label>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={isSubmitting} disabled={accounts.length === 0 || !isValid}>
              {isEdit ? 'Save Changes' : 'Add Transaction'}
            </Button>
          </DialogFooter>

        </form>
      </DialogContent>
    </Dialog>
  )
}
