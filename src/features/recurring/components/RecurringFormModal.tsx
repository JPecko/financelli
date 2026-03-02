import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { format } from 'date-fns'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toCents, fromCents } from '@/domain/money'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/domain/categories'
import { useAccounts } from '@/shared/hooks/useAccounts'
import { recurringRepo } from '@/data/repositories/recurringRepo'
import type { RecurringRule, TransactionType, RecurringFrequency } from '@/domain/types'

interface FormValues {
  accountId:  string
  name:       string
  type:       TransactionType
  amount:     string
  category:   string
  description:string
  frequency:  RecurringFrequency
  startDate:  string
}

interface Props {
  open: boolean
  onClose: () => void
  rule?: RecurringRule
}

export default function RecurringFormModal({ open, onClose, rule }: Props) {
  const isEdit = !!rule
  const accounts = useAccounts()

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      accountId:  '',
      name:       '',
      type:       'expense',
      amount:     '',
      category:   'other',
      description:'',
      frequency:  'monthly',
      startDate:  format(new Date(), 'yyyy-MM-dd'),
    },
  })

  const selectedType     = watch('type')
  const selectedAccount  = watch('accountId')
  const selectedCategory = watch('category')
  const selectedFreq     = watch('frequency')

  const categories = selectedType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  useEffect(() => {
    if (open && rule) {
      reset({
        accountId:  String(rule.accountId),
        name:       rule.name,
        type:       rule.type,
        amount:     Math.abs(fromCents(rule.amount)).toFixed(2),
        category:   rule.category,
        description:rule.description,
        frequency:  rule.frequency,
        startDate:  rule.startDate,
      })
    } else if (open) {
      const firstId = accounts[0]?.id != null ? String(accounts[0].id) : ''
      reset({
        accountId:  firstId,
        name:       '',
        type:       'expense',
        amount:     '',
        category:   'other',
        description:'',
        frequency:  'monthly',
        startDate:  format(new Date(), 'yyyy-MM-dd'),
      })
    }
  }, [open, rule, accounts, reset])

  const onSubmit = async (values: FormValues) => {
    const sign   = values.type === 'income' ? 1 : -1
    const amount = sign * toCents(parseFloat(values.amount) || 0)

    const payload = {
      accountId:  parseInt(values.accountId),
      name:       values.name.trim(),
      type:       values.type,
      amount,
      category:   values.category,
      description:values.description.trim(),
      frequency:  values.frequency,
      startDate:  values.startDate,
      nextDue:    values.startDate,
      active:     true,
    }

    if (isEdit && rule?.id != null) {
      await recurringRepo.update(rule.id, payload)
    } else {
      await recurringRepo.add({ ...payload, createdAt: new Date().toISOString() })
    }
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Recurring Rule' : 'New Recurring Rule'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Name */}
          <div className="space-y-1">
            <Label htmlFor="rec-name">Rule Name</Label>
            <Input
              id="rec-name"
              placeholder="e.g. Monthly Rent"
              {...register('name', { required: 'Name is required' })}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          {/* Type toggle */}
          <div className="flex rounded-lg border overflow-hidden">
            {(['expense', 'income'] as TransactionType[]).map(t => (
              <button
                key={t}
                type="button"
                className={`flex-1 py-2 text-sm font-medium capitalize transition-colors ${
                  selectedType === t
                    ? t === 'income' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                    : 'bg-transparent text-muted-foreground hover:bg-muted'
                }`}
                onClick={() => { setValue('type', t); setValue('category', 'other') }}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Account */}
          <div className="space-y-1">
            <Label>Account</Label>
            <Select value={selectedAccount} onValueChange={v => setValue('accountId', v)}>
              <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
              <SelectContent>
                {accounts.map(a => (
                  <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount + Frequency */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="rec-amount">Amount</Label>
              <Input
                id="rec-amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...register('amount', { required: 'Required', min: { value: 0.01, message: 'Must be > 0' } })}
              />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Frequency</Label>
              <Select value={selectedFreq} onValueChange={v => setValue('frequency', v as RecurringFrequency)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Category */}
          <div className="space-y-1">
            <Label>Category</Label>
            <Select value={selectedCategory} onValueChange={v => setValue('category', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {categories.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                      {c.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description + Start Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="rec-desc">Description</Label>
              <Input id="rec-desc" placeholder="Optional" {...register('description')} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="rec-start">Start Date</Label>
              <Input id="rec-start" type="date" {...register('startDate', { required: true })} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={accounts.length === 0}>
              {isEdit ? 'Save Changes' : 'Add Rule'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
