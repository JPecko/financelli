import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { format } from 'date-fns'
import { Wallet, Banknote, PiggyBank, BarChart2, HandCoins, CreditCard } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/components/ui/dialog'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import PlainSelect from '@/shared/components/PlainSelect'
import AmountInput from '@/shared/components/AmountInput'
import DateInput from '@/shared/components/DateInput'
import FormToggle from '@/shared/components/FormToggle'
import BankLogo from '@/shared/components/BankLogo'
import { BANK_OPTIONS } from '@/shared/config/banks'
import { toCents, fromCents } from '@/domain/money'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, CATEGORIES, tCategory } from '@/domain/categories'
import { useSortedAccounts } from '@/shared/hooks/useAccounts'
import { addRule, updateRule } from '@/shared/hooks/useRecurringRules'
import type { RecurringRule, TransactionType, RecurringFrequency, Account } from '@/domain/types'
import { useT } from '@/shared/i18n'

// ── Helpers ───────────────────────────────────────────────────────────────────

const TYPE_ICONS: Record<string, React.ElementType> = {
  checking:   Banknote,
  savings:    PiggyBank,
  investment: BarChart2,
  cash:       HandCoins,
  credit:     CreditCard,
}

function AccountOptionContent({ account }: { account: Account }) {
  const bank = account.bankCode ? BANK_OPTIONS.find(b => b.code === account.bankCode) : undefined
  const Icon = TYPE_ICONS[account.type] ?? Wallet
  return (
    <span className="flex items-center gap-2 min-w-0">
      {bank
        ? <BankLogo domain={bank.logoDomain} name={bank.name} accountType={account.type} imgClassName="h-4 w-4 rounded-sm object-contain shrink-0" iconClassName="h-4 w-4 shrink-0 text-muted-foreground" />
        : <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      }
      <span className="truncate">{account.name}</span>
    </span>
  )
}

function buildAccountOption(account: Account) {
  return {
    value: String(account.id),
    label: account.name,
    content: <AccountOptionContent account={account} />,
    selectedContent: <AccountOptionContent account={account} />,
  }
}

const FREQ_OPTIONS = [
  { value: 'weekly',  label: 'Weekly'  },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly',  label: 'Yearly'  },
]

const TYPE_OPTIONS: { value: TransactionType; label: string; active: string; inactive: string }[] = [
  { value: 'expense',  label: 'Expense',  active: 'bg-rose-600 text-white',    inactive: 'bg-transparent text-muted-foreground hover:bg-muted' },
  { value: 'income',   label: 'Income',   active: 'bg-emerald-600 text-white', inactive: 'bg-transparent text-muted-foreground hover:bg-muted' },
  { value: 'transfer', label: 'Transfer', active: 'bg-blue-600 text-white',    inactive: 'bg-transparent text-muted-foreground hover:bg-muted' },
]

// ── Types ─────────────────────────────────────────────────────────────────────

interface FormValues {
  accountId:      string
  toAccountId:    string
  name:           string
  type:           TransactionType
  amount:         string
  category:       string
  description:    string
  frequency:      RecurringFrequency
  startDate:      string
  isShared:       boolean
  splitN:         number
  isReimbursable: boolean
}

interface Props {
  open:    boolean
  onClose: () => void
  rule?:   RecurringRule
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function RecurringFormModal({ open, onClose, rule }: Props) {
  const t      = useT()
  const isEdit = !!rule
  const { data: accounts = [] } = useSortedAccounts()

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    defaultValues: {
      accountId:      '',
      toAccountId:    '',
      name:           '',
      type:           'expense',
      amount:         '',
      category:       'other',
      description:    '',
      frequency:      'monthly',
      startDate:      format(new Date(), 'yyyy-MM-dd'),
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

  const categoryOptions = categories.map(c => ({
    value: c.id,
    label: tCategory(c.id, t),
    content: (
      <span className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
        {tCategory(c.id, t)}
      </span>
    ),
  }))

  useEffect(() => {
    if (open && rule) {
      reset({
        accountId:      String(rule.accountId),
        toAccountId:    rule.toAccountId != null ? String(rule.toAccountId) : '',
        name:           rule.name,
        type:           rule.type,
        amount:         Math.abs(fromCents(rule.amount)).toFixed(2),
        category:       rule.category,
        description:    rule.description,
        frequency:      rule.frequency,
        startDate:      rule.startDate,
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
        accountId:      firstId,
        toAccountId:    secondId,
        name:           '',
        type:           'expense',
        amount:         '',
        category:       'other',
        description:    '',
        frequency:      'monthly',
        startDate:      format(new Date(), 'yyyy-MM-dd'),
        isShared:       firstShared,
        splitN:         firstShared ? (firstAcct!.participants ?? 2) : 2,
        isReimbursable: false,
      })
    }
  }, [open, rule, accounts, reset])

  const handleTypeChange = (type: TransactionType) => {
    setValue('type', type)
    setValue('category', type === 'transfer' ? 'transfer' : 'other')
    if (type === 'income') {
      setValue('isShared', false)
      setValue('splitN', 2)
    } else if (type !== 'transfer') {
      const acct   = accounts.find(a => String(a.id) === selectedAccount)
      const shared = (acct?.participants ?? 1) > 1
      setValue('isShared', shared)
      setValue('splitN', shared ? (acct!.participants ?? 2) : 2)
    }
  }

  const onSubmit = async (values: FormValues) => {
    const abs    = toCents(parseFloat(values.amount.replace(',', '.')) || 0)
    const amount = values.type === 'income' ? abs : -abs

    const payload: Omit<RecurringRule, 'id' | 'createdAt'> = {
      accountId:      parseInt(values.accountId),
      toAccountId:    isTransfer && values.toAccountId ? parseInt(values.toAccountId) : undefined,
      name:           values.name.trim(),
      type:           values.type,
      amount,
      category:       values.category,
      description:    values.description.trim(),
      frequency:      values.frequency,
      startDate:      values.startDate,
      nextDue:        values.startDate,
      active:         true,
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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Recurring Rule' : 'New Recurring Rule'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">

          {/* Name */}
          <div className="space-y-1.5">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>From</Label>
                <PlainSelect
                  value={selectedAccount}
                  onChange={v => setValue('accountId', v)}
                  options={accounts.filter(a => String(a.id) !== selectedTo).map(buildAccountOption)}
                  placeholder="Source"
                />
              </div>
              <div className="space-y-1.5">
                <Label>To</Label>
                <PlainSelect
                  value={selectedTo}
                  onChange={v => setValue('toAccountId', v)}
                  options={accounts.filter(a => String(a.id) !== selectedAccount).map(buildAccountOption)}
                  placeholder="Destination"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>Account</Label>
              <PlainSelect
                value={selectedAccount}
                onChange={v => {
                  setValue('accountId', v)
                  if (selectedType !== 'income') {
                    const acct   = accounts.find(a => String(a.id) === v)
                    const shared = (acct?.participants ?? 1) > 1
                    setValue('isShared', shared)
                    setValue('splitN', shared ? (acct!.participants ?? 2) : 2)
                  }
                }}
                options={accounts.map(buildAccountOption)}
                placeholder="Select account"
              />
            </div>
          )}

          {/* Amount + Frequency */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rec-amount">Amount</Label>
              <AmountInput
                id="rec-amount"
                placeholder="0.00"
                {...register('amount', {
                  required: 'Required',
                  validate: v => parseFloat(String(v).replace(',', '.')) >= 0.01 || 'Must be > 0',
                })}
              />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Frequency</Label>
              <PlainSelect
                value={selectedFreq}
                onChange={v => setValue('frequency', v as RecurringFrequency)}
                options={FREQ_OPTIONS}
              />
            </div>
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label>Category</Label>
            <PlainSelect
              value={selectedCategory}
              onChange={v => setValue('category', v)}
              options={categoryOptions}
            />
          </div>

          {/* Description + Start Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rec-desc">Description</Label>
              <Input id="rec-desc" placeholder="Optional" {...register('description')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rec-start">Start Date</Label>
              <DateInput id="rec-start" value={watch('startDate') ?? ''} onChange={v => setValue('startDate', v)} />
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
                <FormToggle on={isShared} />
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
                    {(splitN ?? 2) >= 2 && (
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
              <FormToggle on={isReimbursable} color="bg-amber-500" />
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
