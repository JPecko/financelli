import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toCents, fromCents } from '@/domain/money'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/domain/categories'
import { addTransaction, updateTransaction } from '@/shared/hooks/useTransactions'
import { useAccounts } from '@/shared/hooks/useAccounts'
import { isoToday } from '@/shared/utils/format'
import type { Transaction, TransactionType } from '@/domain/types'

interface FormValues {
  accountId: string
  type: TransactionType
  amount: string
  category: string
  description: string
  date: string
}

interface Props {
  open: boolean
  onClose: () => void
  transaction?: Transaction
  defaultType?: TransactionType
}

export default function TransactionFormModal({ open, onClose, transaction, defaultType = 'expense' }: Props) {
  const isEdit = !!transaction
  const accounts = useAccounts()

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      accountId:   '',
      type:        defaultType,
      amount:      '',
      category:    'other',
      description: '',
      date:        isoToday(),
    },
  })

  const selectedType    = watch('type')
  const selectedAccount = watch('accountId')
  const selectedCategory = watch('category')

  const categories = selectedType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  useEffect(() => {
    if (open && transaction) {
      reset({
        accountId:   String(transaction.accountId),
        type:        transaction.type,
        amount:      Math.abs(fromCents(transaction.amount)).toFixed(2),
        category:    transaction.category,
        description: transaction.description,
        date:        transaction.date,
      })
    } else if (open) {
      const firstAccountId = accounts[0]?.id != null ? String(accounts[0].id) : ''
      reset({
        accountId:   firstAccountId,
        type:        defaultType,
        amount:      '',
        category:    'other',
        description: '',
        date:        isoToday(),
      })
    }
  }, [open, transaction, accounts, defaultType, reset])

  const onSubmit = async (values: FormValues) => {
    const sign   = values.type === 'income' ? 1 : -1
    const amount = sign * toCents(parseFloat(values.amount) || 0)

    const payload: Omit<Transaction, 'id' | 'createdAt'> = {
      accountId:   parseInt(values.accountId),
      type:        values.type,
      amount,
      category:    values.category,
      description: values.description.trim(),
      date:        values.date,
    }

    if (isEdit && transaction?.id != null) {
      await updateTransaction(transaction.id, payload)
    } else {
      await addTransaction(payload)
    }
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Transaction' : 'New Transaction'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Type toggle */}
          <div className="flex rounded-lg border overflow-hidden">
            {(['expense', 'income'] as TransactionType[]).map(t => (
              <button
                key={t}
                type="button"
                className={`flex-1 py-2 text-sm font-medium capitalize transition-colors ${
                  selectedType === t
                    ? t === 'income'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-rose-600 text-white'
                    : 'bg-transparent text-muted-foreground hover:bg-muted'
                }`}
                onClick={() => {
                  setValue('type', t)
                  setValue('category', 'other')
                }}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Account */}
          <div className="space-y-1">
            <Label>Account</Label>
            <Select value={selectedAccount} onValueChange={v => setValue('accountId', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map(a => (
                  <SelectItem key={a.id} value={String(a.id)}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {accounts.length === 0 && (
              <p className="text-xs text-destructive">Add an account first</p>
            )}
          </div>

          {/* Amount + Date */}
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
              <Input
                id="tx-date"
                type="date"
                {...register('date', { required: true })}
              />
            </div>
          </div>

          {/* Category */}
          <div className="space-y-1">
            <Label>Category</Label>
            <Select value={selectedCategory} onValueChange={v => setValue('category', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: c.color }}
                      />
                      {c.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <Label htmlFor="tx-desc">Description</Label>
            <Input
              id="tx-desc"
              placeholder="e.g. Electricity bill"
              {...register('description')}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={accounts.length === 0}>
              {isEdit ? 'Save Changes' : 'Add Transaction'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
