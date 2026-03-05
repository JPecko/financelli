import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { format } from 'date-fns'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/components/ui/dialog'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { toCents, fromCents } from '@/domain/money'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, CATEGORIES } from '@/domain/categories'
import { useSortedAccounts } from '@/shared/hooks/useAccounts'
import { addRule, updateRule } from '@/shared/hooks/useRecurringRules'
import type { RecurringRule, TransactionType, RecurringFrequency } from '@/domain/types'

interface FormValues {
  accountId:    string
  toAccountId:  string
  name:         string
  type:         TransactionType
  amount:       string
  category:     string
  description:  string
  frequency:    RecurringFrequency
  startDate:    string
}

interface Props {
  open: boolean
  onClose: () => void
  rule?: RecurringRule
}

const TYPE_OPTIONS: { value: TransactionType; label: string; active: string; inactive: string }[] = [
  { value: 'expense',  label: 'Expense',  active: 'bg-rose-600 text-white',    inactive: 'bg-transparent text-muted-foreground hover:bg-muted' },
  { value: 'income',   label: 'Income',   active: 'bg-emerald-600 text-white', inactive: 'bg-transparent text-muted-foreground hover:bg-muted' },
  { value: 'transfer', label: 'Transfer', active: 'bg-blue-600 text-white',    inactive: 'bg-transparent text-muted-foreground hover:bg-muted' },
]

export default function RecurringFormModal({ open, onClose, rule }: Props) {
  const isEdit   = !!rule
  const { data: accounts = [] } = useSortedAccounts()

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      accountId:    '',
      toAccountId:  '',
      name:         '',
      type:         'expense',
      amount:       '',
      category:     'other',
      description:  '',
      frequency:    'monthly',
      startDate:    format(new Date(), 'yyyy-MM-dd'),
    },
  })

  const selectedType     = watch('type')
  const selectedAccount  = watch('accountId')
  const selectedTo       = watch('toAccountId')
  const selectedCategory = watch('category')
  const selectedFreq     = watch('frequency')
  const isTransfer       = selectedType === 'transfer'

  const categories =
    selectedType === 'income'   ? INCOME_CATEGORIES :
    selectedType === 'transfer' ? CATEGORIES.filter(c => ['transfer', 'capital', 'other'].includes(c.id)) :
    EXPENSE_CATEGORIES

  useEffect(() => {
    if (open && rule) {
      reset({
        accountId:    String(rule.accountId),
        toAccountId:  rule.toAccountId != null ? String(rule.toAccountId) : '',
        name:         rule.name,
        type:         rule.type,
        amount:       Math.abs(fromCents(rule.amount)).toFixed(2),
        category:     rule.category,
        description:  rule.description,
        frequency:    rule.frequency,
        startDate:    rule.startDate,
      })
    } else if (open) {
      const firstId  = accounts[0]?.id != null ? String(accounts[0].id) : ''
      const secondId = accounts[1]?.id != null ? String(accounts[1].id) : ''
      reset({
        accountId:    firstId,
        toAccountId:  secondId,
        name:         '',
        type:         'expense',
        amount:       '',
        category:     'other',
        description:  '',
        frequency:    'monthly',
        startDate:    format(new Date(), 'yyyy-MM-dd'),
      })
    }
  }, [open, rule, accounts, reset])

  // Reset category when switching type
  const handleTypeChange = (t: TransactionType) => {
    setValue('type', t)
    setValue('category', t === 'transfer' ? 'transfer' : 'other')
  }

  const onSubmit = async (values: FormValues) => {
    const abs = toCents(parseFloat(values.amount) || 0)
    const amount = values.type === 'income' ? abs : -abs // transfer also stored negative

    const payload: Omit<RecurringRule, 'id' | 'createdAt'> = {
      accountId:    parseInt(values.accountId),
      toAccountId:  isTransfer && values.toAccountId ? parseInt(values.toAccountId) : undefined,
      name:         values.name.trim(),
      type:         values.type,
      amount,
      category:     values.category,
      description:  values.description.trim(),
      frequency:    values.frequency,
      startDate:    values.startDate,
      nextDue:      values.startDate,
      active:       true,
    }

    if (isEdit && rule?.id != null) {
      await updateRule(rule.id, payload)
    } else {
      await addRule(payload)
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
            {TYPE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                className={`flex-1 py-2 text-sm font-medium capitalize transition-colors ${
                  selectedType === opt.value ? opt.active : opt.inactive
                }`}
                onClick={() => handleTypeChange(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Account(s) */}
          {isTransfer ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>From</Label>
                <Select value={selectedAccount} onValueChange={v => setValue('accountId', v)}>
                  <SelectTrigger><SelectValue placeholder="Source" /></SelectTrigger>
                  <SelectContent>
                    {accounts.filter(a => String(a.id) !== selectedTo).map(a => (
                      <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>To</Label>
                <Select value={selectedTo} onValueChange={v => setValue('toAccountId', v)}>
                  <SelectTrigger><SelectValue placeholder="Destination" /></SelectTrigger>
                  <SelectContent>
                    {accounts.filter(a => String(a.id) !== selectedAccount).map(a => (
                      <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
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
          )}

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
            <Button
              type="submit"
              disabled={
                accounts.length === 0 ||
                (isTransfer && (!selectedAccount || !selectedTo || selectedAccount === selectedTo))
              }
            >
              {isEdit ? 'Save Changes' : 'Add Rule'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
