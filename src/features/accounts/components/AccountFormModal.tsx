import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/components/ui/dialog'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { toCents, fromCents } from '@/domain/money'
import { addAccount, updateAccount } from '@/shared/hooks/useAccounts'
import { BANK_OPTIONS } from '@/shared/config/banks'
import type { Account, AccountType } from '@/domain/types'

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: 'checking',   label: 'Checking' },
  { value: 'savings',    label: 'Savings' },
  { value: 'investment', label: 'Investment' },
  { value: 'cash',       label: 'Cash' },
  { value: 'credit',     label: 'Credit Card' },
]

const COLORS = [
  '#6366f1', '#3b82f6', '#22c55e', '#f59e0b',
  '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6',
]

const ROUNDUP_OPTIONS = [
  { value: 'off', label: 'Disabled' },
  { value: '1',   label: '×1' },
  { value: '2',   label: '×2' },
  { value: '3',   label: '×3' },
  { value: '4',   label: '×4' },
  { value: '5',   label: '×5' },
  { value: '10',  label: '×10' },
]

interface FormValues {
  name: string
  bankCode: string
  type: AccountType
  balance: string
  currency: string
  color: string
  cashbackPct: string
  roundupMultiplier: string
  investedBase: string
}

interface Props {
  open: boolean
  onClose: () => void
  account?: Account
}

export default function AccountFormModal({ open, onClose, account }: Props) {
  const isEdit = !!account

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    defaultValues: {
      name: '',
      bankCode: 'none',
      type: 'checking',
      balance: '0',
      currency: 'EUR',
      color: COLORS[0],
      cashbackPct: '',
      roundupMultiplier: '',
      investedBase: '',
    },
  })

  const selectedColor    = watch('color')
  const selectedBankCode = watch('bankCode')
  const selectedType     = watch('type')
  const selectedRoundup  = watch('roundupMultiplier')

  useEffect(() => {
    if (open && account) {
      reset({
        name:              account.name,
        bankCode:          account.bankCode ?? 'none',
        type:              account.type,
        balance:           fromCents(account.balance).toFixed(2),
        currency:          account.currency,
        color:             account.color,
        cashbackPct:       account.cashbackPct != null ? String(account.cashbackPct) : '',
        roundupMultiplier: account.roundupMultiplier != null ? String(account.roundupMultiplier) : 'off',
        investedBase:      account.investedBase != null ? fromCents(account.investedBase).toFixed(2) : '',
      })
    } else if (open) {
      reset({
        name: '',
        bankCode: 'none',
        type: 'checking',
        balance: '0',
        currency: 'EUR',
        color: COLORS[0],
        cashbackPct: '',
        roundupMultiplier: 'off',
        investedBase: '',
      })
    }
  }, [open, account, reset])

  const onSubmit = async (values: FormValues) => {
    const payload = {
      name:              values.name.trim(),
      type:              values.type,
      balance:           toCents(parseFloat(values.balance) || 0),
      currency:          values.currency,
      color:             values.color,
      bankCode:          values.bankCode !== 'none' ? values.bankCode : undefined,
      cashbackPct:       values.cashbackPct ? parseFloat(values.cashbackPct) : undefined,
      roundupMultiplier: values.roundupMultiplier && values.roundupMultiplier !== 'off' ? parseInt(values.roundupMultiplier) : undefined,
      investedBase:      values.type === 'investment' && values.investedBase ? toCents(parseFloat(values.investedBase)) : undefined,
    }
    if (isEdit && account?.id != null) {
      await updateAccount(account.id, payload)
    } else {
      await addAccount(payload)
    }
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Account' : 'New Account'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Name */}
          <div className="space-y-1">
            <Label htmlFor="acc-name">Name</Label>
            <Input
              id="acc-name"
              placeholder="e.g. Daily Expenses"
              {...register('name', { required: 'Name is required' })}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          {/* Bank */}
          <div className="space-y-1">
            <Label>Bank</Label>
            <Select value={selectedBankCode} onValueChange={v => setValue('bankCode', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Optional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No bank</SelectItem>
                {BANK_OPTIONS.map(b => (
                  <SelectItem key={b.code} value={b.code}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Type */}
          <div className="space-y-1">
            <Label>Type</Label>
            <Select value={selectedType} onValueChange={v => setValue('type', v as AccountType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACCOUNT_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Balance + Currency */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="acc-balance">
                {isEdit ? 'Balance' : 'Initial Balance'}
              </Label>
              <Input
                id="acc-balance"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register('balance', { required: true })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="acc-currency">Currency</Label>
              <Input
                id="acc-currency"
                placeholder="EUR"
                maxLength={3}
                {...register('currency', { required: true })}
                className="uppercase"
              />
            </div>
          </div>

          {/* Color */}
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c,
                    borderColor: selectedColor === c ? 'white' : 'transparent',
                    boxShadow: selectedColor === c ? `0 0 0 2px ${c}` : 'none',
                  }}
                  onClick={() => setValue('color', c)}
                />
              ))}
            </div>
          </div>

          {/* Invested Base — investment accounts only */}
          {selectedType === 'investment' && (
            <div className="space-y-1">
              <Label htmlFor="acc-invested">Invested Base</Label>
              <Input
                id="acc-invested"
                type="number"
                step="0.01"
                min="0"
                placeholder="Total capital invested (optional)"
                {...register('investedBase')}
              />
              <p className="text-xs text-muted-foreground">Total amount invested (cost basis) — used for P&L tracking</p>
            </div>
          )}

          {/* Cashback & Roundup */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="acc-cashback">Cashback %</Label>
              <Input
                id="acc-cashback"
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="Disabled"
                {...register('cashbackPct', {
                  min: { value: 0, message: '≥ 0' },
                  max: { value: 100, message: '≤ 100' },
                })}
              />
              {errors.cashbackPct && <p className="text-xs text-destructive">{errors.cashbackPct.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Roundup</Label>
              <Select value={selectedRoundup} onValueChange={v => setValue('roundupMultiplier', v)}>
                <SelectTrigger><SelectValue placeholder="Disabled" /></SelectTrigger>
                <SelectContent>
                  {ROUNDUP_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={isSubmitting}>{isEdit ? 'Save Changes' : 'Add Account'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
