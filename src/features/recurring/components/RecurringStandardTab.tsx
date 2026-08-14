import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { format } from 'date-fns'
import { DialogFooter } from '@/shared/components/ui/dialog'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import PlainSelect from '@/shared/components/PlainSelect'
import AmountInput from '@/shared/components/AmountInput'
import DateInput from '@/shared/components/DateInput'
import FormToggle from '@/shared/components/FormToggle'
import { buildGroupedAccountSelectOptions } from '@/features/transactions/components/accountSelectOptions'
import { toCents, fromCents } from '@/domain/money'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, CATEGORIES, tCategory } from '@/domain/categories'
import { useSortedAccounts } from '@/shared/hooks/useAccounts'
import { addRule, updateRule } from '@/shared/hooks/useRecurringRules'
import type { RecurringRule, TransactionType, RecurringFrequency } from '@/domain/types'
import { useT } from '@/shared/i18n'

const FREQ_OPTIONS = [
  { value: 'weekly',  label: 'Weekly'  },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly',  label: 'Yearly'  },
]

interface FormValues {
  accountId:      string
  toAccountId:    string
  name:           string
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
  open:        boolean
  onClose:     () => void
  rule?:       RecurringRule
  defaultType: TransactionType
}

export default function RecurringStandardTab({ open, onClose, rule, defaultType }: Props) {
  const t      = useT()
  const isEdit = !!rule && rule.groupId == null
  const { data: accounts = [] } = useSortedAccounts()
  const isTransfer = defaultType === 'transfer'

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    defaultValues: {
      accountId: '', toAccountId: '', name: '', amount: '', category: 'other', description: '',
      frequency: 'monthly', startDate: format(new Date(), 'yyyy-MM-dd'),
      isShared: true, splitN: 2, isReimbursable: false,
    },
  })

  const selectedAccount  = watch('accountId')
  const selectedTo       = watch('toAccountId')
  const selectedCategory = watch('category')
  const selectedFreq     = watch('frequency')
  const isShared         = watch('isShared')
  const splitN           = watch('splitN')
  const isReimbursable   = watch('isReimbursable')

  const categories =
    defaultType === 'income'   ? INCOME_CATEGORIES :
    defaultType === 'transfer' ? CATEGORIES.filter(c => ['invest-move', 'transfer', 'capital', 'other'].includes(c.id)) :
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
    if (open && isEdit && rule) {
      reset({
        accountId:      String(rule.accountId),
        toAccountId:    rule.toAccountId != null ? String(rule.toAccountId) : '',
        name:           rule.name,
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
        accountId: firstId, toAccountId: secondId, name: '', amount: '',
        category: defaultType === 'transfer' ? 'transfer' : 'other', description: '',
        frequency: 'monthly', startDate: format(new Date(), 'yyyy-MM-dd'),
        isShared: firstShared, splitN: firstShared ? (firstAcct!.participants ?? 2) : 2,
        isReimbursable: false,
      })
    }
  }, [open, rule, isEdit, accounts, reset, defaultType])

  const onSubmit = async (values: FormValues) => {
    const abs    = toCents(parseFloat(values.amount.replace(',', '.')) || 0)
    const amount = defaultType === 'income' ? abs : -abs

    const payload: Omit<RecurringRule, 'id' | 'createdAt'> = {
      accountId:      parseInt(values.accountId),
      toAccountId:    isTransfer && values.toAccountId ? parseInt(values.toAccountId) : undefined,
      name:           values.name.trim(),
      type:           defaultType,
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
      groupId:        null,
      splitMode:      null,
      splitPercents:  null,
      payerMemberId:  null,
      createTx:       true,
    }

    if (isEdit && rule?.id != null) {
      await updateRule(rule.id, payload)
    } else {
      await addRule(payload)
    }
    onClose()
  }

  return (
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

      {/* Account(s) */}
      {isTransfer ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>From</Label>
            <PlainSelect
              value={selectedAccount}
              onChange={v => setValue('accountId', v)}
              options={buildGroupedAccountSelectOptions(accounts.filter(a => String(a.id) !== selectedTo), t)}
              placeholder="Source"
            />
          </div>
          <div className="space-y-1.5">
            <Label>To</Label>
            <PlainSelect
              value={selectedTo}
              onChange={v => setValue('toAccountId', v)}
              options={buildGroupedAccountSelectOptions(accounts.filter(a => String(a.id) !== selectedAccount), t)}
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
              if (defaultType !== 'income') {
                const acct   = accounts.find(a => String(a.id) === v)
                const shared = (acct?.participants ?? 1) > 1
                setValue('isShared', shared)
                setValue('splitN', shared ? (acct!.participants ?? 2) : 2)
              }
            }}
            options={buildGroupedAccountSelectOptions(accounts, t)}
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

      {defaultType === 'expense' && (
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
  )
}
