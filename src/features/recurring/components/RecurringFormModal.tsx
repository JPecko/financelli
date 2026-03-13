import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { format } from 'date-fns'
import { Wallet, Banknote, PiggyBank, BarChart2, HandCoins, CreditCard } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/components/ui/dialog'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import BankLogo from '@/shared/components/BankLogo'
import { BANK_OPTIONS } from '@/shared/config/banks'
import { toCents, fromCents } from '@/domain/money'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, CATEGORIES, tCategory } from '@/domain/categories'
import { useSortedAccounts } from '@/shared/hooks/useAccounts'
import { addRule, updateRule } from '@/shared/hooks/useRecurringRules'
import type { RecurringRule, TransactionType, RecurringFrequency, Account } from '@/domain/types'
import { useT } from '@/shared/i18n'

const TYPE_ICONS: Record<string, React.ElementType> = {
  checking:   Banknote,
  savings:    PiggyBank,
  investment: BarChart2,
  cash:       HandCoins,
  credit:     CreditCard,
}

function AccountOption({ account }: { account: Account }) {
  const bank = account.bankCode ? BANK_OPTIONS.find(b => b.code === account.bankCode) : undefined
  const Icon = TYPE_ICONS[account.type] ?? Wallet
  return (
    <span className="flex items-center gap-2">
      {bank
        ? <BankLogo domain={bank.logoDomain} name={bank.name} accountType={account.type} imgClassName="h-4 w-4 rounded-sm object-contain shrink-0" iconClassName="h-4 w-4 shrink-0 text-muted-foreground" />
        : <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      }
      {account.name}
    </span>
  )
}

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
  isShared:       boolean
  splitN:         number
  isReimbursable: boolean
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
  const t      = useT()
  const isEdit = !!rule
  const { data: accounts = [] } = useSortedAccounts()

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
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
      isShared:       true,
      splitN:         2,
      isReimbursable: false,
    },
  })

  const selectedType     = watch('type')
  const selectedAccount  = watch('accountId')
  const selectedTo       = watch('toAccountId')
  const selectedCategory = watch('category')
  const selectedFreq     = watch('frequency')
  const isShared         = watch('isShared')
  const splitN           = watch('splitN')
  const isReimbursable   = watch('isReimbursable')
  const isTransfer       = selectedType === 'transfer'

  const categories =
    selectedType === 'income'   ? INCOME_CATEGORIES :
    selectedType === 'transfer' ? CATEGORIES.filter(c => ['invest-move', 'transfer', 'capital', 'other'].includes(c.id)) :
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
        isShared:       !(rule.isPersonal ?? false),
        splitN:         rule.splitN ?? 2,
        isReimbursable: rule.isReimbursable ?? false,
      })
    } else if (open) {
      const firstId     = accounts[0]?.id != null ? String(accounts[0].id) : ''
      const secondId    = accounts[1]?.id != null ? String(accounts[1].id) : ''
      const firstAcct   = accounts.find(a => String(a.id) === firstId)
      const firstShared = (firstAcct?.participants ?? 1) > 1
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
        isShared:       firstShared,
        splitN:         firstShared ? (firstAcct!.participants ?? 2) : 2,
        isReimbursable: false,
      })
    }
  }, [open, rule, accounts, reset])

  // Reset category + personal flag when switching type
  const handleTypeChange = (t: TransactionType) => {
    setValue('type', t)
    setValue('category', t === 'transfer' ? 'transfer' : 'other')
    if (t === 'income') {
      setValue('isShared', false)
      setValue('splitN', 2)
    } else if (t !== 'transfer') {
      const acct   = accounts.find(a => String(a.id) === selectedAccount)
      const shared = (acct?.participants ?? 1) > 1
      setValue('isShared', shared)
      setValue('splitN', shared ? (acct!.participants ?? 2) : 2)
    }
  }

  const onSubmit = async (values: FormValues) => {
    const abs = toCents(parseFloat(values.amount.replace(',', '.')) || 0)
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
      isPersonal:     isTransfer ? false : !values.isShared,
      splitN:         (!isTransfer && values.isShared) ? Math.max(2, Math.round(values.splitN ?? 2)) : null,
      isReimbursable: !isTransfer && values.isReimbursable,
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
                      <SelectItem key={a.id} value={String(a.id)}>
                        <AccountOption account={a} />
                      </SelectItem>
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
                      <SelectItem key={a.id} value={String(a.id)}>
                        <AccountOption account={a} />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <Label>Account</Label>
              <Select value={selectedAccount} onValueChange={v => {
                setValue('accountId', v)
                if (selectedType !== 'income') {
                  const acct   = accounts.find(a => String(a.id) === v)
                  const shared = (acct?.participants ?? 1) > 1
                  setValue('isShared', shared)
                  setValue('splitN', shared ? (acct!.participants ?? 2) : 2)
                }
              }}>
                <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent>
                  {accounts.map(a => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      <AccountOption account={a} />
                    </SelectItem>
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
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                {...register('amount', {
                  required: 'Required',
                  validate: v => parseFloat(String(v).replace(',', '.')) >= 0.01 || 'Must be > 0',
                })}
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
                      {tCategory(c.id, t)}
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

          {!isTransfer && (
            <div className="rounded-lg border overflow-hidden">
              <label
                className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer hover:bg-accent/60 transition-colors"
                onClick={e => { e.preventDefault(); setValue('isShared', !isShared) }}
              >
                <div>
                  <p className="text-sm font-medium leading-none">{t('recurring.sharedWithParticipants')}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t('recurring.sharedWithParticipantsDesc')}</p>
                </div>
                <div className="relative shrink-0">
                  <div className={`h-5 w-9 rounded-full transition-colors ${isShared ? 'bg-primary' : 'bg-muted'}`} />
                  <div className={`absolute top-1 h-3 w-3 rounded-full bg-white transition-transform ${isShared ? 'left-5' : 'left-1'}`} />
                </div>
              </label>
              {isShared && (
                <div className="flex items-center gap-2 px-4 py-2.5 border-t bg-muted/30">
                  <span className="text-xs text-muted-foreground">{t('transactions.splitBy')}</span>
                  <Input
                    type="number"
                    min={2}
                    step={1}
                    className="h-7 w-16 text-sm text-center"
                    {...register('splitN', { valueAsNumber: true, min: 2 })}
                  />
                  <span className="text-xs text-muted-foreground">
                    {t('transactions.people')}
                    {isShared && (splitN ?? 2) >= 2 && (
                      <span className="ml-1 text-muted-foreground/60">
                        · {t('transactions.myShare')}: {Math.round(100 / (splitN ?? 2))}%
                      </span>
                    )}
                  </span>
                </div>
              )}
            </div>
          )}

          {selectedType === 'expense' && (
            <label
              className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg border cursor-pointer hover:bg-accent/60 transition-colors"
              onClick={e => { e.preventDefault(); setValue('isReimbursable', !isReimbursable) }}
            >
              <div>
                <p className="text-sm font-medium leading-none">{t('transactions.reimbursable')}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('transactions.reimbursableDesc')}</p>
              </div>
              <div className="relative shrink-0">
                <div className={`h-5 w-9 rounded-full transition-colors ${isReimbursable ? 'bg-amber-500' : 'bg-muted'}`} />
                <div className={`absolute top-1 h-3 w-3 rounded-full bg-white transition-transform ${isReimbursable ? 'left-5' : 'left-1'}`} />
              </div>
            </label>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={onClose}>Cancel</Button>
            <Button
              type="submit"
              loading={isSubmitting}
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
