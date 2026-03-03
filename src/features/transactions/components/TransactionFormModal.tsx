import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/components/ui/dialog'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { useTransactionForm } from './useTransactionForm'
import TransactionTypeTabs from './TransactionTypeTabs'
import AccountSelector from './AccountSelector'
import CategorySelect from './CategorySelect'
import type { Transaction, TransactionType } from '@/domain/types'

interface Props {
  open:         boolean
  onClose:      () => void
  transaction?: Transaction
  defaultType?: TransactionType
}

export default function TransactionFormModal({ open, onClose, transaction, defaultType }: Props) {
  const {
    form,
    isEdit,
    isTransfer,
    isValid,
    categories,
    accounts,
    accountOptions,
    selectedType,
    selectedFrom,
    selectedTo,
    handleTypeChange,
    onSubmit,
  } = useTransactionForm({ open, onClose, transaction, defaultType })

  const { register, setValue, formState: { errors } } = form

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

          <div className="grid grid-cols-2 gap-3">
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={accounts.length === 0 || !isValid}>
              {isEdit ? 'Save Changes' : 'Add Transaction'}
            </Button>
          </DialogFooter>

        </form>
      </DialogContent>
    </Dialog>
  )
}
