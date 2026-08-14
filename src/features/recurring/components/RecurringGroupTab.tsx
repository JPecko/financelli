import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { format } from 'date-fns'
import { DialogFooter } from '@/shared/components/ui/dialog'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import PlainSelect from '@/shared/components/PlainSelect'
import DateInput from '@/shared/components/DateInput'
import RecurringGroupSection from './RecurringGroupSection'
import { useRecurringGroupSplit } from '../hooks/useRecurringGroupSplit'
import { toCents, fromCents } from '@/domain/money'
import { GROUP_EXPENSE_CATS } from '@/features/transactions/components/useGroupTransactionForm'
import { tCategory } from '@/domain/categories'
import { useGroups } from '@/shared/hooks/useGroups'
import { useSortedAccounts } from '@/shared/hooks/useAccounts'
import { useAuth } from '@/features/auth/AuthContext'
import { addRule, updateRule } from '@/shared/hooks/useRecurringRules'
import type { RecurringRule, RecurringFrequency } from '@/domain/types'
import { useT } from '@/shared/i18n'

const FREQ_OPTIONS = [
  { value: 'weekly',  label: 'Weekly'  },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly',  label: 'Yearly'  },
]

interface FormValues {
  name:          string
  groupId:       string
  payerType:     'me' | 'member'
  payerMemberId: string
  accountId:     string
  amount:        string
  category:      string
  description:   string
  frequency:     RecurringFrequency
  startDate:     string
  createTx:      boolean
}

interface Props {
  open:    boolean
  onClose: () => void
  rule?:   RecurringRule
}

export default function RecurringGroupTab({ open, onClose, rule }: Props) {
  const t      = useT()
  const isEdit = !!rule && rule.groupId != null
  const { data: rawGroups = [] } = useGroups()
  const groups = rawGroups.filter((g): g is typeof g & { id: number } => g.id != null)
  const { data: accounts = [] } = useSortedAccounts()
  const { user } = useAuth()

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    defaultValues: {
      name: '', groupId: '', payerType: 'me', payerMemberId: '', accountId: '', amount: '',
      category: 'food', description: '', frequency: 'monthly',
      startDate: format(new Date(), 'yyyy-MM-dd'), createTx: true,
    },
  })

  const groupId       = watch('groupId')
  const amount        = watch('amount')
  const payerType     = watch('payerType')
  const payerMemberId = watch('payerMemberId')
  const accountId     = watch('accountId')
  const createTx      = watch('createTx')
  const selectedFreq  = watch('frequency')
  const selectedCategory = watch('category')

  // Registered (not spread onto an input) purely so setValue(..., { shouldValidate: true })
  // below can validate the amount — it's rendered inside RecurringGroupSection as a controlled input.
  register('amount', {
    required: 'Required',
    validate: v => parseFloat(String(v).replace(',', '.')) >= 0.01 || 'Must be > 0',
  })

  const categoryOptions = GROUP_EXPENSE_CATS.map(c => ({
    value: c.id,
    label: tCategory(c.id, t),
    content: (
      <span className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
        {tCategory(c.id, t)}
      </span>
    ),
  }))

  const groupSplit = useRecurringGroupSplit(groupId, amount, rule, user?.id)

  useEffect(() => {
    if (open && isEdit && rule) {
      reset({
        name:          rule.name,
        groupId:       String(rule.groupId),
        payerType:     rule.payerMemberId != null ? 'member' : 'me',
        payerMemberId: rule.payerMemberId != null ? String(rule.payerMemberId) : '',
        accountId:     String(rule.accountId || (accounts[0]?.id ?? '')),
        amount:        Math.abs(fromCents(rule.amount)).toFixed(2),
        category:      rule.category,
        description:   rule.description,
        frequency:     rule.frequency,
        startDate:     rule.startDate,
        createTx:      rule.createTx ?? true,
      })
    } else if (open) {
      reset({
        name: '', groupId: '', payerType: 'me', payerMemberId: '',
        accountId: accounts[0]?.id != null ? String(accounts[0].id) : '', amount: '',
        category: 'food', description: '', frequency: 'monthly',
        startDate: format(new Date(), 'yyyy-MM-dd'), createTx: true,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, rule, isEdit, reset])

  // Auto-select the only group when there's just one
  useEffect(() => {
    if (!open || groups.length !== 1 || groupId !== '') return
    setValue('groupId', String(groups[0].id))
  }, [open, groups, groupId, setValue])

  const onSubmit = async (values: FormValues) => {
    if (!values.groupId) return
    const amount = -toCents(parseFloat(values.amount.replace(',', '.')) || 0)

    const payload: Omit<RecurringRule, 'id' | 'createdAt'> = {
      accountId:      parseInt(values.accountId) || 0,
      name:           values.name.trim(),
      type:           'expense',
      amount,
      category:       values.category,
      description:    values.description.trim(),
      frequency:      values.frequency,
      startDate:      values.startDate,
      nextDue:        values.startDate,
      active:         true,
      isPersonal:     false,
      splitN:         null,
      isReimbursable: false,
      groupId:        parseInt(values.groupId),
      splitMode:      groupSplit.splitMode === 'percent' ? 'percent' : 'even',
      splitPercents:  groupSplit.splitMode === 'percent'
        ? Object.fromEntries(Object.entries(groupSplit.percents).map(([id, pct]) => [Number(id), parseFloat(pct)]))
        : null,
      payerMemberId:  values.payerType === 'member' && values.payerMemberId ? parseInt(values.payerMemberId) : null,
      createTx:       values.createTx,
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
        <Label htmlFor="rec-grp-name">Rule Name</Label>
        <Input
          id="rec-grp-name"
          placeholder="e.g. Monthly Rent Split"
          {...register('name', { required: 'Name is required' })}
        />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <RecurringGroupSection
        groups={groups}
        groupId={groupId}
        onGroupChange={v => setValue('groupId', v)}
        amount={amount}
        onAmountChange={v => setValue('amount', v, { shouldValidate: true })}
        amountError={errors.amount?.message}
        payerType={payerType}
        onPayerTypeChange={v => setValue('payerType', v)}
        payerMemberId={payerMemberId}
        onPayerMemberChange={v => setValue('payerMemberId', v)}
        createTx={createTx}
        onCreateTxChange={v => setValue('createTx', v)}
        accountId={accountId}
        onAccountChange={v => setValue('accountId', v)}
        currentUserId={user?.id}
        split={groupSplit}
      />

      {/* Frequency */}
      <div className="space-y-1.5">
        <Label>Frequency</Label>
        <PlainSelect
          value={selectedFreq}
          onChange={v => setValue('frequency', v as RecurringFrequency)}
          options={FREQ_OPTIONS}
        />
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
          <Label htmlFor="rec-grp-desc">Description</Label>
          <Input id="rec-grp-desc" placeholder="Optional" {...register('description')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rec-grp-start">Start Date</Label>
          <DateInput id="rec-grp-start" value={watch('startDate') ?? ''} onChange={v => setValue('startDate', v)} />
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" disabled={isSubmitting} onClick={onClose}>Cancel</Button>
        <Button type="submit" loading={isSubmitting} disabled={!groupId || (createTx && !accountId)}>
          {isEdit ? 'Save Changes' : 'Add Rule'}
        </Button>
      </DialogFooter>
    </form>
  )
}
